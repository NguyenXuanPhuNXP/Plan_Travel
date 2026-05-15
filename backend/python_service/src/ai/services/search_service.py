import json
import numpy as np
import torch
from sentence_transformers import SentenceTransformer, util
from ai.services.db_reader import get_connection

class SearchService:
    def __init__(self):
        # Sử dụng model đa ngôn ngữ tốt cho tiếng Việt
        self.model = SentenceTransformer("BAAI/bge-m3")
        self.locations_cache = []
        self.embeddings_cache = None

    def refresh_cache(self):
        """Tải toàn bộ địa điểm có embedding từ DB vào bộ nhớ"""
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT id, name, address, category, subcategory, tags, latitude, longitude, embedding FROM locations WHERE embedding IS NOT NULL")
                rows = cursor.fetchall()
                
                self.locations_cache = []
                embeddings = []
                
                for row in rows:
                    # Chuyển embedding từ string JSON sang list
                    emb = json.loads(row['embedding'])
                    embeddings.append(emb)
                    # Giữ lại các thông tin khác
                    loc_data = {k: v for k, v in row.items() if k != 'embedding'}
                    
                    # Parse tags JSON if it's a string
                    if isinstance(loc_data.get('tags'), str):
                        try:
                            loc_data['tags'] = json.loads(loc_data['tags'])
                        except:
                            loc_data['tags'] = []
                    elif loc_data.get('tags') is None:
                        loc_data['tags'] = []

                    # Convert BigInt id to int for JSON serializability
                    loc_data['id'] = int(loc_data['id'])
                    self.locations_cache.append(loc_data)
                
                if embeddings:
                    self.embeddings_cache = torch.tensor(embeddings)
                else:
                    self.embeddings_cache = None
                    
                print(f"Loaded {len(self.locations_cache)} locations into search cache.")
        finally:
            conn.close()

    def search(self, query: str, limit: int = 10):
        # 1. Semantic Search
        if not self.locations_cache or self.embeddings_cache is None:
            # Nếu chưa có cache (lần đầu hoặc chưa gen embedding), thử search DB bằng LIKE
            return self._db_keyword_search(query, limit)

        query_embedding = self.model.encode(query, convert_to_tensor=True, normalize_embeddings=True)
        
        # Tính cosine similarity
        cos_scores = util.cos_sim(query_embedding, self.embeddings_cache)[0]
        
        # 2. Keyword Search (để boost các kết quả khớp chính xác tên)
        # Ở đây ta làm đơn giản: lấy top semantic và boost nếu có chứa từ khóa
        
        top_results = torch.topk(cos_scores, k=min(limit * 5, len(self.locations_cache)))
        
        results = []
        for score, idx in zip(top_results.values, top_results.indices):
            location = self.locations_cache[idx]
            final_score = score.item()
            
            # Boost nếu khớp keyword trong tên
            if query.lower() in location['name'].lower():
                final_score += 0.2
            
            results.append({
                **location,
                "score": final_score
            })
            
        # Sắp xếp lại theo score đã boost
        results.sort(key=lambda x: x['score'], reverse=True)
        
        return results[:limit]

    def _db_keyword_search(self, query: str, limit: int):
        conn = get_connection()
        try:
            with conn.cursor() as cursor:
                sql = """
                    SELECT id, name, address, category, subcategory, tags, latitude, longitude 
                    FROM locations 
                    WHERE name LIKE %s OR category LIKE %s OR tags LIKE %s 
                    LIMIT %s
                """
                like_query = f"%{query}%"
                cursor.execute(sql, (like_query, like_query, like_query, limit))
                rows = cursor.fetchall()
                for r in rows:
                    r['id'] = int(r['id'])
                    r['score'] = 1.0 # Default score for keyword match
                    
                    # Parse tags JSON if it's a string
                    if isinstance(r.get('tags'), str):
                        try:
                            r['tags'] = json.loads(r['tags'])
                        except:
                            r['tags'] = []
                    elif r.get('tags') is None:
                        r['tags'] = []
                        
                return rows
        finally:
            conn.close()
