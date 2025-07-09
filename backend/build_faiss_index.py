# build_faiss_index.py

from services.rag_pipeline import create_vectorstore

if __name__ == "__main__":
    create_vectorstore()
    print("✅ FAISS index created successfully.")
