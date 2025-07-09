# rag_pipeline.py

import os
from pathlib import Path
from dotenv import load_dotenv
from langchain_community.document_loaders import CSVLoader, PyMuPDFLoader, UnstructuredMarkdownLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from services.llm_engine import OpenRouterLLM

load_dotenv()
api_key = os.getenv("OPENROUTER_API_KEY")
def get_relevant_chunks(user_input: str, k: int = 5):
    # Load vectorstore and retrieve top k docs based on query
    return retriever.invoke(user_input)

# === Load documents ===
def load_documents():
    docs = []

    # CSVs
    csv_folder = Path(r".\data\Exercices")
    for csv in csv_folder.glob("*.csv"):
        try:
            loaded = CSVLoader(str(csv), encoding="utf-8").load()
            print(f"✅ Loaded {len(loaded)} docs from {csv}")
            docs += loaded
        except Exception as e:
            print(f"⚠️ Failed to load CSV {csv}: {e}")

    # PDFs and Markdown
    for folder in ["FitnessPrinciples", "workout_programs"]:
        base_path = Path(rf".\data\{folder}")

        for pdf in base_path.rglob("*.pdf"):
            try:
                loaded = PyMuPDFLoader(str(pdf)).load()
                print(f"✅ Loaded {len(loaded)} docs from {pdf}")
                docs += loaded
            except Exception as e:
                print(f"⚠️ Failed to load PDF {pdf}: {e}")

        for md in base_path.glob("*.md"):
            try:
                loaded = UnstructuredMarkdownLoader(str(md)).load()
                print(f"✅ Loaded {len(loaded)} docs from {md}")
                docs += loaded
            except Exception as e:
                print(f"⚠️ Failed to load Markdown {md}: {e}")

    print(f"📦 Total loaded documents: {len(docs)}")
    return docs

# === Split documents ===
def split_documents(docs, chunk_size=500, overlap=50):
    return RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=overlap).split_documents(docs)

# === Create FAISS vectorstore ===
def create_vectorstore(persist_path="faiss_index"):
    docs = load_documents()
    if not docs:
        raise ValueError("No documents found!")

    chunks = split_documents(docs)
    if not chunks:
        raise ValueError("No chunks created from documents!")

    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vectorstore = FAISS.from_documents(chunks, embeddings)
    vectorstore.save_local(persist_path)
    print(f"✅ Vectorstore saved at: {persist_path}")
    return vectorstore

# === Load retriever from FAISS ===
def load_retriever(persist_path="faiss_index"):
    persist_path = os.path.abspath(r".\faiss_index")
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vectorstore = FAISS.load_local(persist_path, embeddings, allow_dangerous_deserialization=True)
    return vectorstore.as_retriever()

# === Ask RAG question (if needed elsewhere) ===
def ask_rag_question(query, retriever, llm=None):
    llm = OpenRouterLLM(api_key=api_key, model="deepseek/deepseek-r1-0528-qwen3-8b:free") if llm is None else llm
    docs = retriever.get_relevant_documents(query)
    context = "\n\n".join([
        doc.page_content if hasattr(doc, "page_content") else str(doc)
        for doc in docs[:5]
    ])

    prompt = ChatPromptTemplate.from_template("""
Use the following context to answer the question:

{context}

Question: {question}
""")
    chain = prompt | llm | StrOutputParser()
    return chain.invoke({"context": context, "question": query})
