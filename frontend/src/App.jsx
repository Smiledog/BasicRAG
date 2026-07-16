import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Send, FileText, MessageSquare, User, Bot, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import axios from 'axios';

const API_BASE = "http://127.0.0.1:8000";

function App() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'สวัสดีค่ะ! อัปโหลดไฟล์ PDF หรือ Text เข้ามา แล้วเริ่มคุยกับข้อมูลในไฟล์ได้เลยนะคะ ✨' }
  ]);
  const [input, setInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingChat, scrollToBottom]);

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles.map(file => ({ file, status: 'pending' })));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf']
    }
  });

  const uploadFiles = async () => {
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const fileObj = files[i];
      const formData = new FormData();
      formData.append('file', fileObj.file);
      try {
        await axios.post(`${API_BASE}/upload`, formData);
        // We need to update the specific object in the array correctly for React state
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'completed' } : f));
      } catch (error) {
        console.error("Upload error:", error);
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error' } : f));
      }
    }
    setUploading(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loadingChat) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoadingChat(true);

    try {
      const response = await axios.post(`${API_BASE}/chat`, { query: userMessage });
      setMessages(prev => [...prev, { role: 'bot', content: response.data.response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'bot', content: 'ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อ' }]);
    } finally {
      setLoadingChat(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar: File Management */}
      <div className="w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 rounded-lg">
              <FileText size={24} className="text-indigo-600" />
            </div>
            RAG Knowledge
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Upload Zone */}
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
              ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'}
            `}
          >
            <input {...getInputProps()} />
            <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Upload className="text-indigo-600" size={24} />
            </div >
            <p className="text-sm font-medium text-slate-700">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</p>
            <p className="text-xs text-slate-400 mt-1">PDF, TXT เท่านั้น</p>
          </div>

          {/* File List Section */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Files</h3>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{files.length}</span>
              </div>
              
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm group hover:border-indigo-100 transition-colors">
                    <div className="flex items-center gap-3 truncate mr-2">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        f.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                        f.status === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {f.status === 'completed' ? <CheckCircle2 size={16} /> : 
                         f.status === 'error' ? <AlertCircle size={16} /> : <Clock size={16} />}
                      </div >
                      <span className="text-sm font-medium text-slate-700 truncate">{f.file.name}</span>
                    </div >
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-tight ${
                      f.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                      f.status === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {f.status === 'completed' ? 'Done' : f.status === 'error' ? 'Error' : 'Pending'}
                    </span>
                  </div >
                ))}
              </div >

              <button 
                onClick={uploadFiles}
                disabled={uploading || files.every(f => f.status === 'completed')}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all shadow-md shadow-indigo-100"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={18} /> Uploading...
                  </span>
                ) : 'Process Files'}
              </button>
            </div >
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 sticky top-0 z-10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-3">
            <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
            Chat with Documents
          </h2>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
            <div className={`w-2 h-2 rounded-full ${files.length > 0 ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
            {files.length > 0 ? 'System Ready' : 'Waiting for files'}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 scroll-smooth custom-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex gap-4 max-w-[85%] lg:max-w-[70%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border transition-transform hover:scale-105 ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white border-indigo-500 order-last' 
                    : 'bg-white text-slate-500 border-slate-200'
                }`}>
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div >
                {/* Bubble */}
                <div className={`relative p-4 rounded-[2rem] shadow-sm transition-all ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-slate-200/50'
                }`}>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div >
              </div >
            </div>
          ))}

          <div ref={messagesEndRef} />

          {loadingChat && (
            <div className="flex justify-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                <Bot size={20} />
              </div >
              <div className="bg-white px-6 py-4 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-3">
                 <span className="text-sm text-slate-500 font-medium">Thinking</span>
                 <Loader2 className="animate-spin text-indigo-500" size={18} />
              </div >
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 lg:p-6 bg-white/80 backdrop-blur-md border-t border-slate-200">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your documents..."
              className="w-full p-4 pr-16 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-[15px] shadow-inner group-hover:bg-white"
            />
            <button 
              type="submit"
              disabled={loadingChat || !input.trim()}
              className="absolute right-2 top-2 bottom-2 px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all shadow-md flex items-center justify-center"
            >
              <Send size={20} />
            </button>
          </form>
          <p className="text-center text-[10px] text-slate-400 mt-3 uppercase tracking-widest font-medium">
            Powered by RAG Technology • Ask questions to get instant answers from your files.
          </p>
        </div >
      </div>
    </div>
  );
}

export default App;