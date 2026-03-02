import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2, Plus, Paperclip, X, Settings as SettingsIcon, ArrowRight, MessageSquare, Menu, Trash2, Sparkles, Image as ImageIcon, FileText, FileSpreadsheet, File as FileIcon, Presentation, Copy, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { createChat, generateTitle, generateImage } from '../services/gemini';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  file?: {
    data: string;
    mimeType: string;
    name?: string;
  };
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

interface SelectedFile {
  data: string;
  mimeType: string;
  name: string;
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('taem_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: s.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const [chat, setChat] = useState(() => {
    const systemInstruction = `You are Taem, a helpful and intelligent AI assistant. 
    The user's name is ${user?.name || 'User'}. 
    The user's email is ${user?.email || 'Unknown'}.
    Your personality is set to: ${user?.preferences?.personality || 'Concise & Direct'}.
    The user's preferred language is: ${user?.preferences?.language || 'English (US)'}.
    Always address the user by their name when appropriate. 
    You provide accurate and helpful responses using markdown.`;
    return createChat(systemInstruction);
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={20} />;
    if (mimeType === 'application/pdf') return <FileText size={20} className="text-red-400" />;
    if (mimeType.includes('word') || mimeType.includes('msword')) return <FileText size={20} className="text-blue-400" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileSpreadsheet size={20} className="text-emerald-400" />;
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return <Presentation size={20} className="text-orange-400" />;
    return <FileIcon size={20} className="text-zinc-400" />;
  };

  const copyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Save sessions to localStorage
  useEffect(() => {
    localStorage.setItem('taem_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Update current session messages when they change
  useEffect(() => {
    if (currentSessionId) {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages } : s
      ));
    }
  }, [messages, currentSessionId]);

  // Re-initialize chat if preferences change
  useEffect(() => {
    const systemInstruction = `You are Taem, a helpful and intelligent AI assistant. 
    The user's name is ${user?.name || 'User'}. 
    The user's email is ${user?.email || 'Unknown'}.
    Your personality is set to: ${user?.preferences?.personality || 'Concise & Direct'}.
    The user's preferred language is: ${user?.preferences?.language || 'English (US)'}.
    Always respond in the user's preferred language unless they explicitly ask for another language.
    Always address the user by their name when appropriate. 
    You provide accurate and helpful responses using markdown.`;
    setChat(createChat(systemInstruction));
  }, [user?.preferences]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'image/',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv'
    ];

    const isAllowed = allowedTypes.some(type => file.type.startsWith(type));

    if (!isAllowed) {
      alert('File type not supported. Please select an image, PDF, Word, Excel, or PPT file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const data = base64.split(',')[1];
      setSelectedFile({
        data,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const processMessage = async (text: string, file: SelectedFile | null) => {
    if ((!text.trim() && !file) || isLoading) return;

    // Create new session if none exists
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: sessionId,
        title: 'New Chat',
        messages: [],
        createdAt: new Date()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(sessionId);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
      file: file ? { data: file.data, mimeType: file.mimeType, name: file.name } : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Check if the user is asking to generate an image
      const imageKeywords = ['generate image', 'create picture', 'make an image', 'draw a', 'show me a picture of', 'generate a picture'];
      const isImageRequest = imageKeywords.some(keyword => text.toLowerCase().includes(keyword));

      if (isImageRequest && !file) {
        const imageUrl = await generateImage(text);
        if (imageUrl) {
          const assistantMessageWithImage: Message = {
            ...assistantMessage,
            content: `Here is the image you requested: ${text}`,
            file: {
              data: imageUrl.split(',')[1],
              mimeType: 'image/png'
            }
          };
          setMessages(prev => prev.map(m => m.id === assistantMessageId ? assistantMessageWithImage : m));
          setIsLoading(false);
          return;
        }
      }

      const messageParts: any[] = [];
      if (file) {
        messageParts.push({
          inlineData: {
            data: file.data,
            mimeType: file.mimeType
          }
        });
      }
      if (text) {
        messageParts.push(text);
      } else if (file) {
        messageParts.push("What is in this image?");
      }

      const stream = await chat.sendMessageStream({ message: messageParts });
      let fullContent = '';
      
      for await (const chunk of stream) {
        fullContent += chunk.text || '';
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === assistantMessageId 
              ? { ...msg, content: fullContent } 
              : msg
          )
        );
      }

      // Generate title if it's the first exchange
      if (newMessages.length <= 2) {
        const title = await generateTitle([...newMessages, { ...assistantMessage, content: fullContent }]);
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title } : s));
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === assistantMessageId 
            ? { ...msg, content: "I encountered an error. Please try again." } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && !selectedFile) return;
    processMessage(input, selectedFile);
    setInput('');
    setSelectedFile(null);
  };

  const regenerateResponse = () => {
    if (messages.length < 2 || isLoading) return;
    
    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserMessageIndex === -1) return;
    
    const actualIndex = messages.length - 1 - lastUserMessageIndex;
    const lastUserMessage = messages[actualIndex];
    
    // Remove all messages after the last user message
    const previousMessages = messages.slice(0, actualIndex);
    setMessages(previousMessages);
    
    // Re-send the last user message
    processMessage(lastUserMessage.content, lastUserMessage.file ? {
      data: lastUserMessage.file.data,
      mimeType: lastUserMessage.file.mimeType,
      name: lastUserMessage.file.name || 'File'
    } : null);
  };

  const createNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    resetChat();
  };

  const resetChat = () => {
    const systemInstruction = `You are Taem, a helpful and intelligent AI assistant. 
    The user's name is ${user?.name || 'User'}. 
    The user's email is ${user?.email || 'Unknown'}.
    Your personality is set to: ${user?.preferences?.personality || 'Concise & Direct'}.
    The user's preferred language is: ${user?.preferences?.language || 'English (US)'}.
    Always address the user by their name when appropriate. 
    You provide accurate and helpful responses using markdown.`;
    setChat(createChat(systemInstruction));
  };

  const selectSession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
    // We don't reset the chat history in the Gemini session here because 
    // the current SDK implementation doesn't easily support restoring history 
    // to a specific point without re-creating the whole chat.
    // For now, we'll just re-initialize the chat for the new session context.
    resetChat();
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      createNewChat();
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 200, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="h-full bg-zinc-900 border-r border-zinc-800 flex flex-col z-20"
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <Sparkles size={18} className="text-zinc-100" />
                </div>
                <span className="font-bold tracking-tight text-zinc-100">Recent Chats</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
              >
                <Menu size={18} />
              </button>
            </div>
            
            <div className="p-4">
              <button
                onClick={createNewChat}
                className="w-full py-3 px-4 bg-zinc-100 text-zinc-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg"
              >
                <Plus size={18} />
                New Conversation
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => selectSession(session)}
                  className={cn(
                    "w-full p-3 rounded-xl text-left flex items-center gap-3 group transition-all cursor-pointer",
                    currentSessionId === session.id 
                      ? "bg-zinc-800 text-zinc-100" 
                      : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-100"
                  )}
                >
                  <MessageSquare size={18} className="shrink-0" />
                  <span className="flex-1 truncate text-sm font-medium">{session.title}</span>
                  <button
                    onClick={(e) => deleteSession(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded-md transition-all text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                    <MessageSquare size={24} />
                  </div>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">No recent chats</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-zinc-800">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-800/50">
                <img src={user?.avatar} alt="User" className="w-8 h-8 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate text-zinc-100">{user?.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
                </div>
                <button 
                  onClick={() => navigate('/settings')}
                  className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400"
                >
                  <SettingsIcon size={16} />
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-zinc-400 hover:text-zinc-100 transition-all"
              >
                <Menu size={20} />
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-zinc-900 cursor-pointer transition-all group">
              <span className="text-sm font-bold text-zinc-100 tracking-tight">Taem 3.5</span>
              <ArrowRight size={14} className="text-zinc-500 group-hover:text-zinc-300 rotate-90" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={createNewChat}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-all rounded-xl hover:bg-zinc-800"
              title="New Chat"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="p-2 text-zinc-400 hover:text-zinc-100 transition-all rounded-xl hover:bg-zinc-800"
              title="Settings"
            >
              <SettingsIcon size={20} />
            </button>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-3xl mx-auto w-full p-6 space-y-8">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-md mx-auto py-20">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-28 h-28 rounded-[2.5rem] bg-zinc-900 shadow-2xl flex items-center justify-center border border-zinc-800"
                >
                  <Sparkles size={48} className="text-zinc-100" />
                </motion.div>
                <div className="space-y-3">
                  <h2 className="text-4xl font-bold tracking-tight text-zinc-100">Hello, {user?.name.split(' ')[0]}</h2>
                  <p className="text-zinc-500 text-sm leading-relaxed font-medium">
                    I'm Taem, your personal AI companion. I'm ready to help you with anything on your mind.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 w-full">
                  {[
                    "Write a creative story about a time traveler",
                    "Explain the basics of machine learning",
                    "Help me plan a 3-day trip to Tokyo"
                  ].map((prompt, idx) => (
                    <motion.button
                      key={prompt}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => setInput(prompt)}
                      className="px-5 py-4 text-sm text-left text-zinc-400 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-zinc-100 hover:bg-zinc-800 transition-all duration-300 group flex items-center justify-between"
                    >
                      <span className="font-medium">"{prompt}"</span>
                      <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-4 group",
                      message.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-zinc-800",
                      message.role === 'user' ? "bg-zinc-800" : "bg-zinc-900"
                    )}>
                      {message.role === 'user' ? (
                        <img src={user?.avatar} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Sparkles size={16} className="text-zinc-100" />
                      )}
                    </div>
                    <div className={cn(
                      "flex-1 space-y-2",
                      message.role === 'user' ? "text-right" : "text-left"
                    )}>
                      {message.file && (
                        <div className={cn(
                          "mb-2 rounded-2xl overflow-hidden shadow-lg inline-block text-left",
                          message.role === 'user' ? "ml-auto" : "mr-auto"
                        )}>
                          {message.file.mimeType.startsWith('image/') ? (
                            <img 
                              src={`data:${message.file.mimeType};base64,${message.file.data}`} 
                              alt="Uploaded content"
                              className="max-w-md h-auto object-cover rounded-2xl border border-zinc-800"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl min-w-[240px]">
                              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                                {getFileIcon(message.file.mimeType)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate text-zinc-100">{message.file.name || 'Document'}</p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                                  {message.file.mimeType.split('/')[1].toUpperCase()}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className={cn(
                        "markdown-body inline-block text-left",
                        message.role === 'user' ? "bg-zinc-900/50 px-4 py-2 rounded-2xl border border-zinc-800" : ""
                      )} dir="auto">
                        <Markdown>{message.content}</Markdown>
                      </div>
                      <div className={cn(
                        "flex items-center gap-4 mt-1",
                        message.role === 'user' ? "justify-end" : "justify-start"
                      )}>
                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-30">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => copyToClipboard(message.content, message.id)}
                              className="p-1 hover:bg-zinc-900 rounded transition-all text-zinc-600 hover:text-zinc-300"
                              title="Copy"
                            >
                              {copiedId === message.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                            </button>
                            {messages[messages.length - 1].id === message.id && !isLoading && (
                              <button
                                onClick={regenerateResponse}
                                className="p-1 hover:bg-zinc-900 rounded transition-all text-zinc-600 hover:text-zinc-300"
                                title="Regenerate"
                              >
                                <RotateCcw size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-sm">
                      <Sparkles size={20} className="text-zinc-100 animate-pulse" />
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl rounded-tl-none px-5 py-4 flex items-center gap-3 shadow-sm">
                      <Loader2 size={18} className="animate-spin text-zinc-400" />
                      <span className="text-sm text-zinc-400 font-bold uppercase tracking-widest">Taem is thinking...</span>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input */}
        <footer className="p-4 md:p-6 bg-zinc-950">
          <div className="max-w-3xl mx-auto">
            {selectedFile && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="mb-4 p-3 bg-zinc-900/50 rounded-2xl flex items-center gap-4 w-fit pr-5 border border-zinc-800 shadow-sm"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-800 flex items-center justify-center shadow-inner border border-zinc-700">
                  {selectedFile.mimeType.startsWith('image/') ? (
                    <img 
                      src={`data:${selectedFile.mimeType};base64,${selectedFile.data}`} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    getFileIcon(selectedFile.mimeType)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate max-w-[180px] text-zinc-200">{selectedFile.name}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                    {selectedFile.mimeType.startsWith('image/') ? 'Image Attached' : 'Document Attached'}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 hover:bg-zinc-800 rounded-full transition-all text-zinc-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}
            <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-[28px] p-2 focus-within:border-zinc-700 transition-all shadow-xl">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-3 text-zinc-400 hover:text-zinc-100 transition-all rounded-full hover:bg-zinc-800"
              >
                <Paperclip size={20} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                className="hidden"
              />
              <textarea
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                placeholder={selectedFile ? "Add a caption..." : "Message Taem..."}
                disabled={isLoading}
                dir="auto"
                className="flex-1 bg-transparent border-none focus:ring-0 text-zinc-100 py-3 px-2 text-sm resize-none max-h-40 overflow-y-auto placeholder:text-zinc-500 font-medium"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as any);
                  }
                }}
              />
              <div className="flex items-center gap-1 pr-1">
                <button
                  type="button"
                  onClick={() => setInput("Generate an image of: ")}
                  className="p-2.5 text-zinc-400 hover:text-zinc-100 transition-all rounded-full hover:bg-zinc-800"
                  title="Generate Image"
                >
                  <ImageIcon size={18} />
                </button>
                <button
                  type="submit"
                  disabled={(!input.trim() && !selectedFile) || isLoading}
                  className="p-2.5 bg-zinc-100 text-zinc-900 rounded-full disabled:opacity-20 transition-all hover:scale-105 active:scale-95 shadow-lg"
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            </form>
            <p className="text-[10px] text-center text-zinc-600 mt-4 uppercase tracking-[0.2em] font-bold">
              Taem Intelligence Engine
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
