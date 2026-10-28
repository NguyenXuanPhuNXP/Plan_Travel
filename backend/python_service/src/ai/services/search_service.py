import json
import torch
from sentence_transformers import SentenceTransformer, util
from ai.services.db_reader import get_connection


class SearchService:
    def __init__(self):
        # Sử dụng model đa ngôn ngữ tốt cho tiếng Việt
        self.model = SentenceTransformer("BAAI/bge-m3")
        self.locations_cache = []
        self.embeddings_cache = None

    def embed_text(self, text: str):
        clean_text = (text or "").strip()
        if not clean_text:
            return None
        embedding = self.model.encode(clean_text, normalize_embeddings=True)
        return embedding.tolist()

    def _safe_parse_embedding(self, raw_embedding):
        if raw_embedding is None:
            return None

        if isinstance(raw_embedding, (list, tuple)):
            return [float(x) for x in raw_embedding]

        if isinstance(raw_embedding, bytes):
            raw_embedding = raw_embedding.decode("utf-8", errors="ignore")

        if isinstance(raw_embedding, str):
            raw_embedding = raw_embedding.strip()
            if not raw_embedding:
                return None
            try:
                parsed = json.loads(raw_embedding)
                if isinstance(parsed, list):
                    return [float(x) for x in parsed]
            except Exception:
                return None

        return None

    def refresh_cache(self):
        """Tải toàn bộ địa điểm có embedding từ DB vào bộ nhớ"""
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id, name, address, category, subcategory, region, city, province, tags, latitude, longitude, embedding
                    FROM locations
                    WHERE embedding IS NOT NULL
                    """
                )
                rows = cursor.fetchall()

                self.locations_cache = []
                embeddings = []

                for row in rows:
                    emb = self._safe_parse_embedding(row.get("embedding"))
                    if not emb:
                        continue

                    embeddings.append(emb)

                    loc_data = {k: v for k, v in row.items() if k != "embedding"}

                    if isinstance(loc_data.get("tags"), str):
                        try:
                            loc_data["tags"] = json.loads(loc_data["tags"])
                        except Exception:
                            loc_data["tags"] = []
                    elif loc_data.get("tags") is None:
                        loc_data["tags"] = []

                    loc_data["id"] = int(loc_data["id"])
                    self.locations_cache.append(loc_data)

                if embeddings:
                    self.embeddings_cache = torch.tensor(embeddings, dtype=torch.float32)
                else:
                    self.embeddings_cache = None

                print(f"Loaded {len(self.locations_cache)} locations into search cache.")
        finally:
            conn.close()

    def _keyword_score(self, query_lower: str, location: dict):
        name = str(location.get("name") or "").lower()
        category = str(location.get("category") or "").lower()
        subcategory = str(location.get("subcategory") or "").lower()
        region = str(location.get("region") or "").lower()
        city = str(location.get("city") or "").lower()
        province = str(location.get("province") or "").lower()
        address = str(location.get("address") or "").lower()
        tags = location.get("tags") or []

        score = 0.0
        if query_lower and name == query_lower:
            score += 1.0
        if query_lower and query_lower in name:
            score += 0.7
        if query_lower and query_lower in category:
            score += 0.45
        if query_lower and query_lower in subcategory:
            score += 0.35
        if query_lower and (query_lower in region or query_lower in city or query_lower in province):
            score += 0.25
        if query_lower and query_lower in address:
            score += 0.15

        for tag in tags:
            tag_text = str(tag or "").lower()
            if query_lower and query_lower in tag_text:
                score += 0.2
                break

        return min(score, 1.0)

    def search(self, query: str, limit: int = 10, region: str = None, category: str = None):
        query = (query or "").strip()
        if not query:
            return []

        if limit <= 0:
            limit = 10

        # Nếu chưa có cache thì fallback sang keyword DB
        if not self.locations_cache or self.embeddings_cache is None:
            return self._db_keyword_search(query, limit, region, category)

        query_embedding = self.model.encode(query, convert_to_tensor=True, normalize_embeddings=True)
        cos_scores = util.cos_sim(query_embedding, self.embeddings_cache)[0]

        query_lower = query.lower()
        region_lower = (region or "").strip().lower()
        category_lower = (category or "").strip().lower()

        # Lấy top rộng hơn rồi filter/rerank
        top_k = min(max(limit * 8, 20), len(self.locations_cache))
        top_results = torch.topk(cos_scores, k=top_k)

        results = []
        for score, idx in zip(top_results.values, top_results.indices):
            location = self.locations_cache[int(idx)]

            if region_lower:
                loc_region = str(location.get("region") or "").lower()
                loc_city = str(location.get("city") or "").lower()
                loc_province = str(location.get("province") or "").lower()
                if region_lower not in loc_region and region_lower not in loc_city and region_lower not in loc_province:
                    continue

            if category_lower:
                loc_category = str(location.get("category") or "").lower()
                loc_subcategory = str(location.get("subcategory") or "").lower()
                if category_lower not in loc_category and category_lower not in loc_subcategory:
                    continue

            semantic_score = float(score.item())
            # Normalize cosine [-1,1] -> [0,1]
            semantic_score_norm = max(0.0, min(1.0, (semantic_score + 1.0) / 2.0))
            keyword_score = self._keyword_score(query_lower, location)

            # Hybrid weighted score
            final_score = 0.75 * semantic_score_norm + 0.25 * keyword_score

            results.append({
                **location,
                "score": round(final_score, 6),
                "semanticScore": round(semantic_score_norm, 6),
                "keywordScore": round(keyword_score, 6)
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]

    def _db_keyword_search(self, query: str, limit: int, region: str = None, category: str = None):
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                sql = """
                    SELECT id, name, address, category, subcategory, region, city, province, tags, latitude, longitude
                    FROM locations
                    WHERE (name LIKE %s OR category LIKE %s OR subcategory LIKE %s OR tags LIKE %s)
                """
                params = []
                like_query = f"%{query}%"
                params.extend([like_query, like_query, like_query, like_query])

                if region:
                    sql += " AND (region LIKE %s OR city LIKE %s OR province LIKE %s)"
                    region_like = f"%{region}%"
                    params.extend([region_like, region_like, region_like])

                if category:
                    sql += " AND (category LIKE %s OR subcategory LIKE %s)"
                    category_like = f"%{category}%"
                    params.extend([category_like, category_like])

                sql += " ORDER BY updated_at DESC LIMIT %s"
                params.append(int(limit))

                cursor.execute(sql, tuple(params))
                rows = cursor.fetchall()

                query_lower = query.lower()
                for r in rows:
                    r["id"] = int(r["id"])
                    if isinstance(r.get("tags"), str):
                        try:
                            r["tags"] = json.loads(r["tags"])
                        except Exception:
                            r["tags"] = []
                    elif r.get("tags") is None:
                        r["tags"] = []

                    keyword_score = self._keyword_score(query_lower, r)
                    r["score"] = round(keyword_score if keyword_score > 0 else 0.5, 6)
                    r["semanticScore"] = None
                    r["keywordScore"] = round(keyword_score, 6)

                rows.sort(key=lambda x: x["score"], reverse=True)
                return rows
        finally:
            conn.close()
