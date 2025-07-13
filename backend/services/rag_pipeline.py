# ✅ Corrected and Integrated AI Fitness Coach RAG Pipeline

import os
from pathlib import Path
from dotenv import load_dotenv
from langchain_community.document_loaders import CSVLoader, PyMuPDFLoader, UnstructuredMarkdownLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from services.llm_engine import LLMEngine

load_dotenv()

def load_documents():
    docs = []

    csv_folder = Path("./data/Exercices")
    for csv in csv_folder.glob("*.csv"):
        try:
            docs += CSVLoader(str(csv), encoding="utf-8").load()
        except Exception as e:
            print(f"❌ Error loading CSV {csv}: {e}")

    for folder in ["FitnessPrinciples", "workout_programs"]:
        base_path = Path(f"./data/{folder}")
        for pdf in base_path.rglob("*.pdf"):
            try:
                docs += PyMuPDFLoader(str(pdf)).load()
            except Exception as e:
                print(f"❌ Error loading PDF {pdf}: {e}")

        for md in base_path.glob("*.md"):
            try:
                docs += UnstructuredMarkdownLoader(str(md)).load()
            except Exception as e:
                print(f"❌ Error loading MD {md}: {e}")

    print(f"📄 Total documents loaded: {len(docs)}")
    return docs

def split_documents(docs, chunk_size=500, overlap=50):
    splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=overlap)
    return splitter.split_documents(docs)

def create_vectorstore(persist_path="faiss_index"):
    docs = load_documents()
    chunks = split_documents(docs)
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vectorstore = FAISS.from_documents(chunks, embeddings)
    vectorstore.save_local(persist_path)
    print(f"✅ FAISS index saved at {persist_path}")
    return vectorstore

def load_retriever(persist_path="faiss_index"):
    path = os.path.abspath(persist_path)
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vectorstore = FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
    return vectorstore.as_retriever()

def ask_rag_question(query, retriever):
    llm = LLMEngine(provider="ollama", model="gemma:2b")
    docs = retriever.get_relevant_documents(query)
    context = "\n\n".join(doc.page_content for doc in docs[:5] if hasattr(doc, "page_content"))

    prompt = f"""
Use the following context to answer the question:

{context}

Question: {query}
""".strip()

    print("🧠 Final Prompt Sent to LLM:\n", prompt[:2000])  # print first 2000 chars
    response = llm.invoke(prompt)
    return response
