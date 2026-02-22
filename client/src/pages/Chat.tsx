import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Send, Plus, Trash2, MessageCircle, ArrowLeft, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

const SUGGESTED_QUESTIONS = [
  "What makes cashmere quality vary so much between brands?",
  "How can I tell if a silk garment is high quality?",
  "Which designers are best for sustainable linen pieces?",
  "What's the difference between merino wool grades?",
  "How should I care for my leather jacket long-term?",
  "What are the most eco-friendly luxury fabrics?",
];

export default function Chat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) setConversations(await res.json());
    } catch {}
  };

  const loadConversation = async (id: number) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setActiveConv(id);
        setSidebarOpen(false);
      }
    } catch {}
  };

  const createConversation = async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      if (res.ok) {
        const conv = await res.json();
        setConversations(prev => [conv, ...prev]);
        setActiveConv(conv.id);
        setMessages([]);
        setSidebarOpen(false);
      }
    } catch {}
  };

  const deleteConversation = async (id: number) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConv === id) {
        setActiveConv(null);
        setMessages([]);
      }
    } catch {}
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    let convId = activeConv;
    if (!convId) {
      try {
        const title = content.slice(0, 40) + (content.length > 40 ? "..." : "");
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (res.ok) {
          const conv = await res.json();
          convId = conv.id;
          setActiveConv(conv.id);
          setConversations(prev => [conv, ...prev]);
        }
      } catch {
        return;
      }
    }

    const userMessage: Message = { role: "user", content };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("Failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter(l => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.content) {
              assistantContent += data.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment." }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isNewChat = !activeConv && messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-4rem-3.5rem)] md:h-[calc(100vh-4rem)] -mx-4 md:-mx-8" data-testid="page-chat">
      <aside className={`${sidebarOpen ? 'fixed inset-0 z-40 bg-background' : 'hidden'} md:relative md:flex md:w-72 flex-col border-r border-border/40 bg-background shrink-0`}>
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Conversations</span>
          <div className="flex items-center gap-2">
            <button onClick={createConversation} className="p-2 hover:bg-secondary/50 transition-colors active:scale-95" data-testid="button-new-chat">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => setSidebarOpen(false)} className="p-2 md:hidden hover:bg-secondary/50" data-testid="button-close-sidebar">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No conversations yet.
            </div>
          ) : (
            conversations.map(conv => (
              <div key={conv.id}
                className={`group flex items-center justify-between px-4 py-3 cursor-pointer border-b border-border/10 transition-colors ${activeConv === conv.id ? 'bg-secondary/50' : 'hover:bg-secondary/30'}`}
                onClick={() => loadConversation(conv.id)}
                data-testid={`conv-${conv.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate font-serif">{conv.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(conv.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-secondary transition-all active:scale-90"
                  data-testid={`button-delete-conv-${conv.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 md:hidden hover:bg-secondary/50 transition-colors" data-testid="button-open-sidebar">
              <MessageCircle className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-serif">Material Advisor</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">AI Fashion Expert</span>
            </div>
          </div>
          <button onClick={createConversation} className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors py-1.5 px-3 border border-border/40 hover:border-foreground active:scale-95" data-testid="button-new-chat-header">
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
          {isNewChat ? (
            <div className="flex flex-col items-center justify-center h-full gap-8 max-w-xl mx-auto text-center">
              <div className="flex flex-col gap-3">
                <h2 className="text-2xl md:text-3xl font-serif">Material Advisor</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your personal AI expert on luxury fabrics, designer quality, material care, and sustainable fashion. Ask anything about fashion and materials.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)}
                    className="text-left p-3 md:p-4 border border-border/40 text-xs md:text-sm text-foreground/80 hover:border-foreground hover:bg-secondary/30 transition-all active:scale-[0.98]"
                    data-testid={`button-suggested-${i}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 max-w-2xl mx-auto">
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`} data-testid={`message-${msg.role}-${i}`}>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground px-1">
                    {msg.role === 'user' ? 'You' : 'Material Advisor'}
                  </span>
                  <div className={`max-w-[85%] md:max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-foreground text-background'
                      : 'bg-secondary/50 border border-border/20 text-foreground'
                  }`}>
                    {msg.content || (isStreaming && i === messages.length - 1 ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                      </span>
                    ) : '')}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border/40 px-4 md:px-6 py-3 md:py-4">
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-2xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about fabrics, designers, care tips..."
              className="flex-1 bg-background border border-border/60 px-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted-foreground/40 resize-none min-h-[44px] max-h-[120px]"
              rows={1}
              disabled={isStreaming}
              data-testid="input-chat-message"
            />
            <button type="submit" disabled={!input.trim() || isStreaming}
              className="bg-foreground text-background p-3 disabled:opacity-30 hover:bg-foreground/90 transition-all active:scale-95 self-end"
              data-testid="button-send-message">
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-2 max-w-2xl mx-auto">
            Powered by AI. Responses are for informational purposes and may not be fully accurate.
          </p>
        </div>
      </div>
    </div>
  );
}
