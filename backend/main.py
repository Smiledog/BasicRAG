import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_openai import ChatOpenAI
from langchain_classic.chains import RetrievalQA
from langchain_core.prompts import PromptTemplate
from config import settings

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Welcome to RAG Backend API"}

# CORS Setup for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ใน production ควรระบุ URL ของ frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.CHROMA_DB_DIR, exist_ok=True)

# Initialize RAG Components (Global-ish for simplicity in prototype)
embeddings = HuggingFaceEmbeddings(
    model_name=settings.EMBEDDING_MODEL_NAME,
    model_kwargs={"device": settings.EMBEDDING_DEVICE},
)
vectorstore = Chroma(persist_directory=settings.CHROMA_DB_DIR, embedding_function=embeddings)
# Using ChatOpenAI for LM Studio compatibility (requires /v1 in base_url)
llm = ChatOpenAI(
    base_url=f"{settings.OLLAMA_BASE_URL}/v1",
    api_key="lm-studio", 
    model=settings.OLLAMA_MODEL
)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Load and Split Document
        if file.filename.endswith(".pdf"):
            loader = PyPDFLoader(file_path)
        elif file.filename.endswith(".txt"):
            loader = TextLoader(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type")

        documents = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        docs = text_splitter.split_documents(documents)

        # Add to Vector Store
        vectorstore.add_documents(docs)
        
        return {"message": f"File '{file.filename}' processed and added to knowledge base."}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(payload: dict):
    query = payload.get("query")
    if not query:
        raise HTTPException(status_code=400, detail="Query is required")

    try:
        # Setup Custom Prompt
        template = f"{settings.RAG_SYSTEM_PROMPT}\n\nContext:\n{{context}}\n\nQuestion: {{question}}"
        prompt = PromptTemplate(
            template=template, 
            input_variables=["context", "question"]
        )

        # Setup Retrieval Chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            chain_type="stuff",
            retriever=vectorstore.as_retriever(),
            chain_type_kwargs={"prompt": prompt}
        )
        
        response = qa_chain.invoke({"query": query})
        return {"response": response["result"]}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}
