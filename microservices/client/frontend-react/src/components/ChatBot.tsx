import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, Bot, User, X, MessageCircle, Loader2, RefreshCw } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  sources?: Array<{
    file_name: string;
    page?: number;
    score?: number;
    text_preview?: string;
  }>;
  timestamp: Date;
  modelUsed?: string;
  usingOpenai?: boolean;
  usingOllama?: boolean;
}

interface ChatBotProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ChatBot({ isOpen = false, onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: '👋 Bonjour ! Je suis l\'assistant virtuel de SchoolReg. Comment puis-je vous aider aujourd\'hui ?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(isOpen);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus sur l'input quand le chat s'ouvre
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30000);
      const response = await fetch('http://localhost:5003/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ question: userMessage.content }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Erreur lors de la communication avec le serveur');
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.answer || 'Désolé, je n\'ai pas pu générer une réponse.',
        sources: data.sources,
        timestamp: new Date(),
        modelUsed: data.model_used,
        usingOpenai: data.using_openai,
        usingOllama: data.using_ollama
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: (error instanceof DOMException && error.name === 'AbortError')
          ? '⏱️ Le serveur met trop de temps à répondre. Réessayez dans un instant.'
          : '❌ Désolé, une erreur s\'est produite. Veuillez réessayer.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: '1',
        type: 'bot',
        content: '👋 Conversation réinitialisée. Comment puis-je vous aider ?',
        timestamp: new Date()
      }
    ]);
  };

  const toggleOpen = () => {
    setOpen(!open);
    if (onClose && open) {
      onClose();
    }
  };

  if (!open) {
    return createPortal(
      (
        <button
          onClick={toggleOpen}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 z-[9999] flex items-center gap-2 group"
          title="Ouvrir l'assistant virtuel"
        >
          <MessageCircle className="w-6 h-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
            Besoin d'aide ?
          </span>
        </button>
      ),
      document.body
    );
  }

  return createPortal(
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-[9999] border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">Assistant SchoolReg</h3>
            <p className="text-xs text-blue-100">En ligne</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Nouvelle conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleOpen}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {message.type === 'user' ? (
                <User className="w-4 h-4" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>

            {/* Message bubble */}
            <div className={`flex-1 ${message.type === 'user' ? 'items-end' : ''}`}>
              <div
                className={`inline-block max-w-[85%] p-3 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Badge modèle AI */}
                {message.type === 'bot' && message.modelUsed && (
                  <div className="mt-2 flex items-center gap-1">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        message.usingOpenai
                          ? 'bg-gray-900 text-white'
                          : message.usingOllama
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}
                      title={message.modelUsed}
                    >
                      {message.usingOpenai ? '🤖 OpenAI' : message.usingOllama ? '🦙 Ollama' : 'AI'}
                    </span>
                  </div>
                )}
              </div>

              {/* Sources - MASQUÉES PAR DEMANDE UTILISATEUR */}
              {/* {message.sources && message.sources.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Sources:</p>
                  {message.sources.map((source, idx) => (
                    <div
                      key={idx}
                      className="text-xs bg-white border border-gray-200 rounded-lg p-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">
                          📄 {source.file_name}
                        </span>
                        {source.page && (
                          <span className="text-gray-500">Page {source.page}</span>
                        )}
                      </div>
                      {source.score && (
                        <div className="text-gray-400 mt-1">
                          Pertinence: {(source.score * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )} */}

              <p className="text-xs text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Bot className="w-4 h-4 text-gray-600" />
            </div>
            <div className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Posez votre question..."
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 rounded-full transition-colors flex items-center justify-center"
            title="Envoyer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Appuyez sur Entrée pour envoyer
        </p>
      </div>
    </div>
  , document.body);
}
