# ✅ Optimized AI Fitness Coach RAG Pipeline with Timeout Handling

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
import time

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

def load_retriever(persist_path="faiss_index", k=6):
    """Load retriever with optimized parameters"""
    path = os.path.abspath(persist_path)
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vectorstore = FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
    return vectorstore.as_retriever(search_kwargs={"k": k})

def ask_rag_question(query, retriever, max_context_length=1500, timeout_seconds=45):
    """Optimized RAG question with timeout handling and context limiting"""
    
    try:
        print(f"🔍 RAG Query: {query}")
        start_time = time.time()
        
        # Use updated retriever method
        docs = retriever.invoke(query)
        
        # Limit context length to prevent timeouts
        context_parts = []
        total_length = 0
        
        for doc in docs:
            content = doc.page_content if hasattr(doc, "page_content") else str(doc)
            if total_length + len(content) <= max_context_length:
                context_parts.append(content)
                total_length += len(content)
            else:
                # Add partial content if it fits
                remaining_space = max_context_length - total_length
                if remaining_space > 100:  # Only add if meaningful space left
                    context_parts.append(content[:remaining_space])
                break
        
        context = "\n\n".join(context_parts)
        
        # Create concise prompt to avoid timeouts
        prompt = f"""Based on this fitness knowledge, answer concisely:

{context}

Question: {query}

Answer briefly and focus on key points."""

        print(f"🧠 Context length: {len(context)} chars")
        print(f"🧠 Prompt length: {len(prompt)} chars")
        
        # Initialize LLM with timeout considerations
        llm = LLMEngine(provider="ollama", model="qwen2.5:3b-instruct")
        
        try:
            response = llm.invoke(prompt)
            
            elapsed_time = time.time() - start_time
            print(f"✅ RAG response generated in {elapsed_time:.1f}s")
            
            return response
            
        except Exception as llm_error:
            elapsed_time = time.time() - start_time
            if elapsed_time > timeout_seconds:
                print(f"⏰ LLM timeout after {elapsed_time:.1f}s")
                # Return context directly if LLM times out
                return f"Retrieved relevant fitness information: {context[:500]}..."
            else:
                raise llm_error
                
    except Exception as e:
        print(f"❌ RAG question failed: {e}")
        return "Unable to retrieve fitness information from database."

def get_relevant_fitness_context(query, retriever, max_length=1000):
    """Direct context retrieval without LLM processing - faster for workout generation"""
    
    try:
        print(f"🔍 Direct context retrieval: {query}")
        
        # Get relevant documents
        docs = retriever.invoke(query)
        
        # Filter and combine relevant content
        relevant_parts = []
        total_length = 0
        
        for doc in docs:
            content = doc.page_content if hasattr(doc, "page_content") else str(doc)
            
            # Basic relevance filtering
            if any(term in content.lower() for term in query.lower().split()[:3]):
                if total_length + len(content) <= max_length:
                    relevant_parts.append(content)
                    total_length += len(content)
                else:
                    # Add partial content
                    remaining = max_length - total_length
                    if remaining > 50:
                        relevant_parts.append(content[:remaining])
                    break
        
        context = "\n\n".join(relevant_parts)
        print(f"✅ Retrieved {len(relevant_parts)} relevant chunks ({len(context)} chars)")
        
        return context
        
    except Exception as e:
        print(f"❌ Context retrieval failed: {e}")
        return ""