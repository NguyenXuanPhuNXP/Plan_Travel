import json
import pymysql
from sentence_transformers import SentenceTransformer
from ai.config.ai_settings import DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

def get_connection():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True
    )

def main():
    print("Loading model...")
    model = SentenceTransformer("BAAI/bge-m3")
    
    conn = get_connection()
    try:
        with conn.cursor() as cursor:
            # Lấy các địa điểm chưa có embedding
            cursor.execute("SELECT id, name, category, subcategory, tags FROM locations WHERE embedding IS NULL")
            rows = cursor.fetchall()
            
            print(f"Found {len(rows)} locations to process.")
            
            batch_size = 32
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i+batch_size]
                
                # Tạo text để encode (tên + category + tags)
                texts = []
                for row in batch:
                    text = f"{row['name']} {row['category'] or ''} {row['subcategory'] or ''} {row.get('tags', '')}"
                    texts.append(text)
                
                embeddings = model.encode(texts, convert_to_tensor=False, normalize_embeddings=True)
                
                for row, emb in zip(batch, embeddings):
                    # Lưu embedding dưới dạng JSON string
                    cursor.execute(
                        "UPDATE locations SET embedding = %s WHERE id = %s",
                        (json.dumps(emb.tolist()), row['id'])
                    )
                
                print(f"Processed {i + len(batch)} / {len(rows)}...")
                
    finally:
        conn.close()
        print("Done!")

if __name__ == "__main__":
    main()
