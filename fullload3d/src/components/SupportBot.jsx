import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Phone, ThumbsUp, ThumbsDown } from "lucide-react";
import { KNOWLEDGE_BASE } from "../data/knowledgeBase";

const WHATSAPP_NUMBER = "5511999999999"; // Substitua pelo número real

export default function SupportBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { type: "bot", text: "Olá! Sou o Loadzinho 🤖. Como posso ajudar você hoje?" }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [awaitingFeedback, setAwaitingFeedback] = useState(false);
    const messagesEndRef = useRef(null);
    const chatRef = useRef(null);
    const toggleRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                isOpen &&
                chatRef.current &&
                !chatRef.current.contains(event.target) &&
                toggleRef.current &&
                !toggleRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { type: "user", text: userMsg }]);
        setInput("");
        setIsTyping(true);

        // Simulate thinking delay with variable natural timing
        setTimeout(() => {
            processMessage(userMsg);
            setIsTyping(false);
        }, 1200);
    };

    const processMessage = (text) => {
        const lowerInput = text.toLowerCase();

        // 1. Search in KB
        let foundAnswer = null;
        let foundType = null;

        for (const item of KNOWLEDGE_BASE) {
            if (item.keywords.some(k => lowerInput.includes(k))) {
                foundAnswer = item.answer;
                foundType = item.type;
                break;
            }
        }

        // 2. Handle Found Answer
        if (foundAnswer === "human_handoff") {
            triggerHandoff("Entendi! Parece que você precisa de uma ajuda mais específica. 👇");
        } else if (foundAnswer) {
            setMessages(prev => [...prev, { type: "bot", text: foundAnswer }]);

            if (foundType === 'solution') {
                setTimeout(() => {
                    setIsTyping(true);
                    setTimeout(() => {
                        setMessages(prev => [...prev, { type: "bot", text: "Isso ajudou? 💖", isFeedback: true }]);
                        setAwaitingFeedback(true);
                        setIsTyping(false);
                    }, 800);
                }, 500);
            }
        } else {
            // 3. Fallback (Not found)
            setMessages(prev => [...prev, {
                type: "bot",
                text: "Poxa, ainda estou aprendendo e não entendi muito bem... 🤔"
            }]);
            setTimeout(() => {
                triggerHandoff("Quer falar com um especialista no WhatsApp? 📱");
            }, 500);
        }
    };

    const handleFeedback = (isPositive) => {
        setAwaitingFeedback(false);
        if (isPositive) {
            setMessages(prev => [...prev, { type: "bot", text: "Oba! Fico feliz em ajudar! Até a próxima! 👋✨" }]);
        } else {
            triggerHandoff("Poxa... entendi. Quer falar direto com um especialista no WhatsApp? 📱");
        }
    };

    const triggerHandoff = (text) => {
        setMessages(prev => [...prev, {
            type: "bot",
            text: text,
            isHandoff: true
        }]);
    };

    const handleWhatsappClick = () => {
        const history = messages
            .map(m => `${m.type === 'bot' ? 'Loadzinho' : 'Cliente'}: ${m.text}`)
            .join('\n');

        const text = encodeURIComponent(`Olá! Preciso de ajuda no FullLoad.\n\nHistórico da conversa:\n${history}`);
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');

        setMessages(prev => [...prev, { type: "bot", text: "Tchauzinho! 👋 Já chamei o reforço no WhatsApp para te ajudar!" }]);
    };

    const handleNoWhatsapp = () => {
        setMessages(prev => [...prev, { type: "bot", text: "Tudo bem! Se precisar de algo, é só chamar. Tchauzinho! 👋" }]);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">

            {/* Chat Window with Glassmorphism */}
            <div
                ref={chatRef}
                className={`pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 w-80 sm:w-96 mb-4 transition-all duration-300 origin-bottom-right overflow-hidden flex flex-col ${isOpen ? "scale-100 opacity-100 transform translate-y-0" : "scale-90 opacity-0 translate-y-10 h-0 w-0"}`}
                style={{ maxHeight: '500px', boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.25)' }}
            >
                {/* Header with Gradient */}
                <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-4 flex justify-between items-center text-white shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/5 pattern-dots opacity-10"></div>
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm border border-white/10 relative">
                            <Bot size={20} />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-orange-600 rounded-full animate-pulse"></div>
                        </div>
                        <div>
                            <h3 className="font-bold text-shadow-sm">Loadzinho</h3>
                            <p className="text-xs text-orange-100 font-medium opacity-90">Online agora</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-2 rounded-xl transition-all duration-200 active:scale-95">
                        <X size={18} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 min-h-[300px] scrollbar-thin scrollbar-thumb-slate-200">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm leading-relaxed ${msg.type === 'user'
                                ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-tr-sm'
                                : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'
                                }`}>
                                {msg.text}
                            </div>

                            {/* Action Buttons for Bot Messages */}
                            {msg.isFeedback && (
                                <div className="flex gap-2 mt-2 animate-in fade-in zoom-in duration-300">
                                    <button onClick={() => handleFeedback(true)} className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-green-100 hover:scale-105 transition-all shadow-sm border border-green-100">
                                        <ThumbsUp size={12} /> Sim
                                    </button>
                                    <button onClick={() => handleFeedback(false)} className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-100 hover:scale-105 transition-all shadow-sm border border-red-100">
                                        <ThumbsDown size={12} /> Não
                                    </button>
                                </div>
                            )}

                            {msg.isHandoff && (
                                <div className="flex flex-col gap-2 mt-2 w-full max-w-[85%] animate-in fade-in zoom-in duration-300">
                                    <button
                                        onClick={handleWhatsappClick}
                                        className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 w-full"
                                    >
                                        <Phone size={14} />
                                        Chamar no WhatsApp
                                    </button>
                                    <button
                                        onClick={handleNoWhatsapp}
                                        className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-xl text-xs font-bold transition-colors w-full"
                                    >
                                        Não precisa, obrigado
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className="flex justify-start animate-in fade-in duration-300">
                            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm p-4 shadow-sm flex gap-1.5 items-center">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSend();
                            }
                            e.stopPropagation();
                        }}
                        placeholder="Digite sua dúvida..."
                        disabled={awaitingFeedback || isTyping}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all disabled:opacity-50 placeholder:text-slate-400"
                    />
                    <button
                        onClick={handleSend}
                        disabled={awaitingFeedback || isTyping || !input.trim()}
                        className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white p-2.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 disabled:shadow-none disabled:active:scale-100"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>

            {/* Toggle Button with Notification Badge Pulse */}
            <div className="relative group">
                <button
                    ref={toggleRef}
                    onClick={() => setIsOpen(!isOpen)}
                    className="pointer-events-auto bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white p-4 rounded-full shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 relative z-10"
                >
                    {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
                </button>
                {/* Pulse Effect Background */}
                {!isOpen && (
                    <span className="absolute inset-0 rounded-full bg-orange-500 opacity-30 animate-ping group-hover:opacity-50 transition-opacity"></span>
                )}
            </div>
        </div>
    );
}