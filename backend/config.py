import os
from pydantic import BaseModel

class Settings(BaseModel):
    # Ollama Configuration
    OLLAMA_BASE_URL: str = "http://127.0.0.1:1234"
    OLLAMA_MODEL: str = "gemma-4-26b-a4b-it"  # เปลี่ยนเป็นโมเดลที่พี่โอใช้
    
    # Embedding Configuration
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-m3"
    # Device for embedding model: "cpu" (default, stable, no VRAM needed)
    # or "cuda" (faster, requires GPU VRAM; e.g. ~2.3 GB free for bge-m3).
    # Switch to "cuda" if you have a GPU and want faster embeddings, BUT
    # close other GPU apps (LM Studio, Ollama, etc.) first to avoid OOM.
    EMBEDDING_DEVICE: str = "cpu"
    
    # Vector DB Configuration
    CHROMA_DB_DIR: str = "backend/data/vector_db"

    # App Configuration
    UPLOAD_DIR: str = "backend/data/uploads"
    RAG_SYSTEM_PROMPT: str = (
        "คุณคือผู้ช่วยอัจฉริยะที่ตอบคำถามโดยใช้ข้อมูลจากเอกสารที่กำหนดให้เท่านั้น "
        "ห้ามใช้ความรู้ภายนอกหรือคาดเดาคำตอบ หากในเอกสารไม่มีข้อมูลที่เกี่ยวข้องกับคำถาม "
        "ให้ตอบว่า 'ขออภัยครับ ไม่พบข้อมูลดังกล่าวในเอกสารที่มีอยู่' เท่านั้น"
    )

settings = Settings()
