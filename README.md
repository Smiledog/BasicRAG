# 📖 RAG System User Guide & Documentation

This document provides instructions on how to run the services and explains the underlying architecture of the RAG (Retrieval-Augmented Generation) application.

---

## 🚀 Quick Start: Running the Services

To run this project, you need to start both the Backend (FastAPI) and the Frontend (React) in separate terminal sessions.

### 1. Backend Service (FastAPI + RAG Engine)
The backend handles file processing, vector storage, and LLM orchestration.

**Steps:**
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Set up a Conda environment named `myenv` (recommended):

   **If you don't have Conda / Miniconda yet**, install Miniconda first:
   ```bash
   # Download and install Miniconda (Linux)
   curl -O https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
   bash Miniconda3-latest-Linux-x86_64.sh
   # Restart your terminal, or:
   source ~/.bashrc
   ```

   **Create and activate the env** (only the first time):
   ```bash
   conda create -n myenv python=3.12 -y
   conda activate myenv
   ```

   **If `myenv` already exists**, just activate it:
   ```bash
   conda activate myenv
   ```
3. Install dependencies (using `uv` for speed — much faster than plain pip):
   ```bash
   uv pip install -r requirements.txt
   ```
   *Note: `uv` is required. If you don't have it, install it with `pip install uv` (inside the activated `myenv`) or see https://docs.astral.sh/uv/.*
4. **Start Ollama / LM Studio** and make sure it's running at `http://127.0.0.1:1234` with the model `gemma-4-26b-a4b-it` loaded.
5. Start the server using Uvicorn:
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   *Use `python -m uvicorn` (not just `uvicorn`) to make sure the server uses the Python in your active conda env, not a system one — otherwise you'll get `ModuleNotFoundError`.*
   *The backend will be available at `http://127.0.0.1:8000`*

---

### 2. Frontend Service (React + Vite)
The frontend provides the user interface for uploading files and chatting.

**Steps:**
1. Open a **new** terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies (if first time):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev -- --port 5174
   ```
   *The frontend will be available at `http://localhost:5174`*

> ⚠️ **Test from the same machine only.** Both the backend and the frontend must run on the same local machine, and you must open the frontend in a browser on that same machine (use `http://localhost:5174` or `http://127.0.0.1:5174`). Opening the frontend from another device on your LAN (e.g. via the machine's LAN IP) will fail because the frontend is hard-coded to call the backend at `http://127.0.0.1:8000`, which on a different machine points to itself, not the backend.

---

## ⚙️ Configuration Guide

Before running the application, you may need to configure the environment settings. All configurations are managed through `backend/config.py`.

### 📍 Configuration Location
- **File Path:** `backend/config.py`

### 🛠️ Key Settings & Variables

| Variable | Description | Default Value / Example |
| :--- | :--- | :--- |
| `OLLAMA_BASE_URL` | The base URL for your local Ollama instance. | `http://localhost:1234` |
| `OLLAMA_MODEL` | The name of the model you want to use in Ollama. | `gemma-4-26b-a4b-it` (must be loaded in LM Studio / Ollama first) |
| `EMBEDDING_MODEL_NAME` | The HuggingFace model used for generating embeddings. | `BAAI/bge-m3` |
| `EMBEDDING_DEVICE` | Device for running the embedding model. | `cpu` (default) or `cuda` — see [Embedding Device: CPU vs GPU](#-embedding-device-cpu-vs-gpu) |
| `CHROMA_DB_DIR` | Local directory where the vector database is stored. | `backend/data/vector_db` |
| `UPLOAD_DIR` | Directory where uploaded files are temporarily stored. | `backend/data/uploads` |

---

## 🧠 Embedding Device: CPU vs GPU

The embedding model (`bge-m3`) can run on CPU or GPU. Pick based on your setup:

### Option A — CPU (default, recommended for most setups)
- ✅ No VRAM needed, works alongside LM Studio / Ollama
- ✅ Stable, no OOM errors
- ❌ Slower: embedding a typical document takes ~5–10× longer than GPU

**Already the default.** Just run the backend as-is.

### Option B — GPU (faster, needs free VRAM)
- ✅ ~5–10× faster embedding
- ❌ Needs ~2.3 GB free VRAM (bge-m3 size)
- ❌ Conflicts with LM Studio / Ollama running on the same GPU → OOM crash

**To switch to GPU:**

1. **Close LM Studio / Ollama first** (or any other GPU process), so you have at least ~3 GB VRAM free.
2. Edit `backend/config.py`:
   ```python
   EMBEDDING_DEVICE: str = "cuda"   # was "cpu"
   ```
3. Start the backend. Embedding will load on GPU.
4. ⚠️ If you want to use LM Studio for chat at the same time, you must run the backend on CPU (Option A) — a 12 GB GPU usually can't fit both `bge-m3` (~2.3 GB) and `gemma-4-26b-a4b-it` (~9+ GB) at the same time.

---

## 🧪 Test Data

A `./testdata/` folder is included with sample files you can use to try the system right away — just drag-and-drop them into the upload zone in the UI.

| File | Type | Status | Notes |
| :--- | :--- | :--- | :--- |
| `testdata/Zcomnet.txt` | `.txt` | ✅ Tested | Works end-to-end (upload → embed → chat). |
| _(no PDF sample yet)_ | `.pdf` | ⚠️ Untested | `PyPDFLoader` is wired up but has never been exercised against a real PDF. If you have a PDF handy, drop one into `./testdata/` and try it — please report any issues. |

**To add your own test files:** just drop any `.pdf` or `.txt` into the `./testdata/` folder (or anywhere on disk) and upload it via the UI. The original is copied to `backend/data/uploads/` and the chunks are embedded into `backend/data/vector_db/` for retrieval.

---

This application implements a **RAG (Retrieval-Augmented Generation)** architecture. Instead of relying solely on the LLM's internal knowledge, it "retrieves" relevant information from your uploaded documents to provide accurate answers.

### 🔄 The Workflow Pipeline

#### A. Data Ingestion (The "Knowledge" Phase)
1. **Upload:** User drags and drops a `.pdf` or `.txt` file into the React UI.
2. **Parsing:** FastAPI receives the file and uses `PyPDFLoader` or `TextLoader` to extract raw text.
3. **Chunking:** The text is split into smaller, manageable pieces (chunks) using `RecursiveCharacterTextSplitter`. This ensures context fits within the LLM's window.
4. **Embedding:** Each chunk is converted into a high-dimensional vector (numerical representation) using the **`BAAI/bge-m3`** model via HuggingFace.
5. **Storage:** These vectors are stored in **ChromaDB** (a local vector database).

#### B. Retrieval & Generation (The "Chat" Phase)
1. **Querying:** User asks a question (e.g., *"What is the summary of this log?"*).
2. **Vector Search:** The user's question is also embedded using `bge-m3`. The system searches ChromaDB for chunks that are mathematically similar to the question.
3. **Augmentation:** The most relevant text chunks are retrieved and combined with the original question into a "Prompt".
4. **Generation:** This enriched prompt is sent to the **Local LLM (via Ollama)**. The LLM reads the provided context and generates an answer based *only* on that information.
5. **Response:** The answer is sent back to the React UI for the user to read.

### 🛠️ Tech Stack Summary
| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS | User Interface & File Upload |
| **Backend** | FastAPI (Python) | API Orchestration & Logic |
| **Orchestration**| LangChain | Connecting LLM, Vector DB, and Tools |
| **Embeddings** | `BAAI/bge-m3` | Turning text into searchable vectors |
| **Vector DB** | ChromaDB | Storing and searching document embeddings |
| **LLM** | Ollama (Local) | Reasoning and generating human-like answers |

---
*Generated by Eie ✨👧*
