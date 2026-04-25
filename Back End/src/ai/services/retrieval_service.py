from typing import List
from src.ai.services.db_reader import get_connection
from src.ai.config.ai_settings import MAX_RETRIEVED_LOCATIONS


CATEGORY_KEYWORDS = {
    "cafe": ["cafe", "coffee", "catering.cafe"],
    "quán cafe": ["cafe", "coffee", "catering.cafe"],
    "quán ăn": ["restaurant", "food", "catering.restaurant", "quan-an"],
    "nhà hàng": ["restaurant", "food", "catering.restaurant"],
    "di tích": ["heritage", "historic", "museum", "bao-tang", "entertainment.museum"],
    "bảo tàng": ["museum", "bao-tang", "entertainment.museum"],
    "biển": ["beach", "bien", "tourism"],
    "núi": ["mountain", "nui", "tourism"],
    "hồ": ["lake", "ho", "tourism"]
}


def normalize_place_keywords(place_types: List[str]) -> List[str]:
    keywords = []
    for item in place_types:
        lowered = item.strip().lower()
        keywords.extend(CATEGORY_KEYWORDS.get(lowered, [lowered]))
    return list(dict.fromkeys(keywords))


def build_context_from_locations(locations: List[dict]) -> str:
    if not locations:
        return "Không có dữ liệu địa điểm phù hợp trong database."

    lines = []
    for idx, loc in enumerate(locations, start=1):
        tags = loc.get("tags") or "[]"
        line = (
            f"{idx}. {loc.get('name', 'Unknown')} | "
            f"category: {loc.get('category') or 'unknown'} | "
            f"region: {loc.get('region') or loc.get('city') or loc.get('province') or 'unknown'} | "
            f"estimated_cost: {loc.get('estimated_cost') or 0} | "
            f"address: {loc.get('address') or 'N/A'} | "
            f"tags: {tags}"
        )
        lines.append(line)
    return "\n".join(lines)


def retrieve_locations(
    destination_type: str,
    place_types: List[str],
    region: str | None,
    budget: int,
    limit: int = MAX_RETRIEVED_LOCATIONS
) -> List[dict]:
    keywords = normalize_place_keywords(place_types + ([destination_type] if destination_type else []))

    sql = """
        SELECT
            id, name, address, country, province, city, district, region,
            category, subcategory, estimated_cost, tags
        FROM locations
        WHERE 1=1
    """
    params = []

    if region:
        sql += " AND (region = %s OR city = %s OR province = %s)"
        params.extend([region, region, region])

    # Lọc ngân sách tương đối mềm: mỗi địa điểm không nên quá 60% tổng budget
    sql += " AND estimated_cost <= %s"
    params.append(max(int(budget * 0.6), 50000))

    if keywords:
        keyword_conditions = []
        for kw in keywords:
            keyword_conditions.append("(LOWER(category) LIKE %s OR LOWER(subcategory) LIKE %s OR LOWER(tags) LIKE %s OR LOWER(name) LIKE %s)")
            like_kw = f"%{kw.lower()}%"
            params.extend([like_kw, like_kw, like_kw, like_kw])
        sql += " AND (" + " OR ".join(keyword_conditions) + ")"

    sql += " ORDER BY estimated_cost ASC LIMIT %s"
    params.append(limit)

    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            return cursor.fetchall()
    finally:
        conn.close()