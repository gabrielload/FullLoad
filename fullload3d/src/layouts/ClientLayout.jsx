// src/layouts/ClientLayout.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../services/firebaseConfig";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, onSnapshot, updateDoc, addDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import {
  Home,
  Package,
  Truck,
  Box,
  Users,
  LogOut,
  Box as BoxIcon,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Settings,
  CreditCard,
  MessageCircle,
  Send
} from "lucide-react";
import NavItem from "../components/NavItem";

export default function ClientLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(auth.currentUser);

  const [nomeEmpresa, setNomeEmpresa] = useState("FullLoad");
  const [logoEmpresa, setLogoEmpresa] = useState("/logo.png");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const [notifications, setNotifications] = useState([]);

  // Chat State
  const [chatStep, setChatStep] = useState(0); // 0: Start, 1: Email, 2: Problem, 3: Final
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { type: 'bot', text: 'Olá! 👋 Como posso ajudar você hoje?' }
  ]);
  const chatEndRef = React.useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, showChat]);

  useEffect(() => {
    const handleOpenChat = () => setShowChat(true);
    window.addEventListener('openChat', handleOpenChat);
    return () => window.removeEventListener('openChat', handleOpenChat);
  }, []);

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatHistory(prev => [...prev, { type: 'user', text: userMsg }]);
    setChatInput("");

    // Bot Logic
    setTimeout(() => {
      let botMsg = "";
      if (chatStep === 0) {
        botMsg = "Para continuarmos, qual é o seu e-mail?";
        setChatStep(1);
      } else if (chatStep === 1) {
        botMsg = "Obrigado! E qual é o problema ou dúvida que você tem?";
        setChatStep(2);
      } else if (chatStep === 2) {
        botMsg = "Entendi. Para um atendimento mais rápido, por favor entre em contato via WhatsApp clicando no link abaixo.";
        setChatStep(3);
      }

      if (botMsg) {
        setChatHistory(prev => [...prev, { type: 'bot', text: botMsg }]);
      }
    }, 1000);
  };

  // Load Notifications
  useEffect(() => {
    const empresaId = localStorage.getItem("empresaId");
    if (!empresaId) return;

    const q = query(
      collection(db, "empresas", empresaId, "notificacoes"),
      orderBy("data", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notifs);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (notifId) => {
    const empresaId = localStorage.getItem("empresaId");
    if (!empresaId) return;
    try {
      const notifRef = doc(db, "empresas", empresaId, "notificacoes", notifId);
      await updateDoc(notifRef, { lida: true });
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const markAllAsRead = async () => {
    const empresaId = localStorage.getItem("empresaId");
    if (!empresaId) return;

    const batch = writeBatch(db);
    const unread = notifications.filter(n => !n.lida);

    unread.forEach(n => {
      const ref = doc(db, "empresas", empresaId, "notificacoes", n.id);
      batch.update(ref, { lida: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  // Helper to simulate notification (for testing)
  const simulateNotification = async () => {
    const empresaId = localStorage.getItem("empresaId");
    if (!empresaId) return;

    const types = ["success", "info", "warning", "error"];
    const type = types[Math.floor(Math.random() * types.length)];

    await addDoc(collection(db, "empresas", empresaId, "notificacoes"), {
      titulo: "Nova Notificação Teste",
      descricao: `Esta é uma notificação de teste gerada em ${new Date().toLocaleTimeString()}`,
      tipo: type,
      lida: false,
      data: serverTimestamp()
    });
  };

  const unreadCount = notifications.filter(n => !n.lida).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-trigger')) {
        setShowNotifications(false);
        setShowSettings(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const carregarEmpresa = async () => {
      if (!user) return;

      try {
        const empresaId = localStorage.getItem("empresaId");
        if (!empresaId) return;

        const docRef = doc(db, "empresas", empresaId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setNomeEmpresa(data.nome || "FullLoad");
          setLogoEmpresa(data.logoUrl || "/logo.png");
        }
      } catch (error) {
        console.error("Erro ao carregar dados da empresa:", error);
      }
    };

    carregarEmpresa();

    // Listen for auth state changes
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
    });

    const handleProfileUpdate = async () => {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        setUser({ ...auth.currentUser });
      }
    };

    window.addEventListener("profile_updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profile_updated", handleProfileUpdate);
      unsubscribeAuth();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: "/dashboard", label: "Painel", icon: Home },
    { path: "/carregamento", label: "Carregamento", icon: Package },
    { path: "/mercadoria", label: "Mercadoria", icon: Box },
    { path: "/UserClient", label: "Usuários", icon: Users },
    { path: "/Caminhao", label: "Caminhões", icon: Truck },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex font-sans text-slate-900">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-[#0f172a] z-40 transition-all duration-300 shadow-2xl
        ${isSidebarOpen ? "w-64" : "w-20"}
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="h-20 flex items-center justify-center border-b border-slate-800/50">
          <div className={`flex items-center gap-3 transition-all duration-300 ${!isSidebarOpen && "justify-center"}`}>
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20 flex-shrink-0">
              {logoEmpresa && logoEmpresa !== "/logo.png" ? (
                <img src={logoEmpresa} alt="Logo" className="w-6 h-6 object-contain invert brightness-0" />
              ) : (
                <span className="text-white font-bold">FL</span>
              )}
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-white text-lg leading-none tracking-tight">FullLoad<span className="text-orange-500">3D</span></h1>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">{nomeEmpresa}</p>
              </div>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="absolute -right-3 top-8 bg-white border border-slate-200 text-slate-400 hover:text-orange-600 rounded-full p-1 shadow-md transition-colors z-50 hidden md:flex"
          >
            {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>

        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100%-160px)]">
          <NavItem to="/dashboard" icon={Home} label="Dashboard" isOpen={isSidebarOpen} active={location.pathname === "/dashboard"} />

          <div className="pt-4 pb-2">
            <p className={`px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider transition-all duration-300 ${!isSidebarOpen && "text-center"}`}>
              {isSidebarOpen ? "Operacional" : "•••"}
            </p>
          </div>

          <NavItem to="/FullLoad" icon={BoxIcon} label="FullLoad 3D" isOpen={isSidebarOpen} active={location.pathname === "/FullLoad"} highlight />
          <NavItem to="/Carregamento" icon={Package} label="Planos de Carga" isOpen={isSidebarOpen} active={location.pathname === "/Carregamento"} />
          <NavItem to="/Mercadoria" icon={Box} label="Mercadorias" isOpen={isSidebarOpen} active={location.pathname === "/Mercadoria"} />
          <NavItem to="/Caminhao" icon={Truck} label="Caminhões" isOpen={isSidebarOpen} active={location.pathname === "/Caminhao"} />

          <div className="pt-4 pb-2">
            <p className={`px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider transition-all duration-300 ${!isSidebarOpen && "text-center"}`}>
              {isSidebarOpen ? "Gestão" : "•••"}
            </p>
          </div>

          <NavItem to="/UserClient" icon={Users} label="Usuários" isOpen={isSidebarOpen} active={location.pathname === "/UserClient"} />
          <NavItem to="/meu-plano" icon={CreditCard} label="Minha Assinatura" isOpen={isSidebarOpen} active={location.pathname === "/meu-plano"} />
        </nav>

        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
          <div className={`flex items-center gap-3 transition-all duration-300 ${!isSidebarOpen && "justify-center"}`}>
            <div className="relative group cursor-pointer" onClick={() => navigate("/perfil")}>
              <div className="w-10 h-10 rounded-full bg-slate-700 border-2 border-slate-600 overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                    {(user?.displayName || user?.email || "U")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
            </div>

            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{user?.displayName || "Usuário"}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            )}

            {isSidebarOpen && (
              <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors" title="Sair">
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${isSidebarOpen ? "md:ml-64" : "md:ml-20"}`}>
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu size={24} />
            </button>


          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Dropdown */}
            <div className="relative dropdown-trigger">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); }}
                className={`p-2 rounded-full hover:bg-slate-100 transition-colors relative ${showNotifications ? 'bg-slate-100 text-orange-500' : 'text-slate-400'}`}
              >
                <Bell size={20} />
                <span className={`absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white ${unreadCount > 0 ? 'animate-pulse' : 'hidden'}`}></span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in-up">
                  <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Notificações ({unreadCount})</h3>
                    <div className="flex gap-2">
                      <span onClick={simulateNotification} className="text-xs text-slate-400 cursor-pointer hover:text-slate-600" title="Criar teste">+ Teste</span>
                      <span onClick={markAllAsRead} className="text-xs text-orange-600 font-medium cursor-pointer hover:underline">Marcar todas</span>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm">
                        Nenhuma notificação.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.lida ? 'bg-orange-50/30' : ''}`}
                        >
                          <div className="flex gap-3">
                            <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${notif.tipo === 'success' ? 'bg-green-500' :
                              notif.tipo === 'warning' ? 'bg-yellow-500' :
                                notif.tipo === 'error' ? 'bg-red-500' : 'bg-blue-500'
                              }`} />
                            <div>
                              <p className={`text-sm text-slate-800 ${!notif.lida ? 'font-bold' : 'font-semibold'}`}>{notif.titulo}</p>
                              <p className="text-xs text-slate-500 mt-1">{notif.descricao}</p>
                              <p className="text-[10px] text-slate-400 mt-2">
                                {notif.data?.seconds ? new Date(notif.data.seconds * 1000).toLocaleString() : 'Agora'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 bg-slate-50 text-center">
                    <Link to="/notificacoes" className="text-xs font-semibold text-slate-600 hover:text-orange-600">Ver todas as notificações</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Dropdown */}
            <div className="relative dropdown-trigger">
              <button
                onClick={() => { setShowSettings(!showSettings); setShowNotifications(false); }}
                className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${showSettings ? 'bg-slate-100 text-slate-600' : 'text-slate-400'}`}
              >
                <Settings size={20} />
              </button>

              {showSettings && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in-up">
                  <div className="p-2 space-y-1">
                    <Link to="/perfil" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
                      <Users size={16} />
                      Meu Perfil
                    </Link>
                    <Link to="/meu-plano" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
                      <CreditCard size={16} />
                      Meu Plano
                    </Link>
                    <Link to="/configuracoes" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
                      <Settings size={16} />
                      Configurações
                    </Link>
                    <div className="border-t border-slate-100 my-1" />
                    <Link to="/ajuda" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-colors">
                      <Box size={16} />
                      Ajuda e Suporte
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <LogOut size={16} />
                      Sair do Sistema
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-fade-in-up">
            {children}
          </div>
        </main>

      </div>

      {/* Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {showChat ? (
          <div className="bg-white rounded-2xl shadow-2xl w-80 h-96 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 border border-slate-200">
            <div className="bg-orange-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><MessageCircle size={18} /> Suporte Online</h3>
              <button onClick={() => setShowChat(false)} className="hover:bg-white/20 p-1 rounded"><X size={18} /></button>
            </div>
            <div className="flex-1 p-4 bg-slate-50 overflow-y-auto">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`mb-3 flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-xl shadow-sm text-sm max-w-[85%] border ${msg.type === 'user'
                    ? 'bg-orange-600 text-white rounded-tr-none border-orange-600'
                    : 'bg-white text-slate-700 rounded-tl-none border-slate-100'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatStep === 3 && (
                <div className="mb-3 flex justify-start">
                  <a
                    href="https://wa.me/555193862814"
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-xl shadow-sm text-sm max-w-[85%] bg-green-500 text-white font-bold hover:bg-green-600 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <MessageCircle size={16} /> Abrir WhatsApp
                  </a>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleChatSubmit} className="p-3 border-t border-slate-100 bg-white flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                className="flex-1 bg-slate-100 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                placeholder="Digite sua mensagem..."
                disabled={chatStep === 3}
              />
              <button
                type="submit"
                disabled={chatStep === 3}
                className="p-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setShowChat(true)}
            className="w-14 h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-lg shadow-orange-600/30 flex items-center justify-center transition-transform hover:scale-110"
          >
            <MessageCircle size={28} />
            <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
          </button>
        )}
      </div>
    </div >
  );
}
