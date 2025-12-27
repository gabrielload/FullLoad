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
  Send,
  FileText
} from "lucide-react";
import NavItem from "../components/NavItem";
import SupportBot from "../components/SupportBot";

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

  const [notifications, setNotifications] = useState([]);




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
    }, (error) => {
      console.error("Erro ao buscar notificações:", error);
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
    <div className="h-screen overflow-hidden bg-[#F8FAFC] flex font-sans text-slate-900 selection:bg-orange-500/20 selection:text-orange-600">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-[#0B1121] z-40 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) shadow-2xl border-r border-white/5
        ${isSidebarOpen ? "w-[280px]" : "w-20"}
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="h-20 flex items-center justify-center border-b border-slate-800/50">
          <div className={`flex items-center gap-3 transition-all duration-300 ${!isSidebarOpen && "justify-center"}`}>
            <div className={`flex items-center gap-3 transition-all duration-300 ${!isSidebarOpen && "justify-center"}`}>
              {isSidebarOpen ? (
                <div className="flex flex-col">
                  <img src="/logo-orange.png" alt="FullLoad 3D" className="h-12 w-auto object-contain" />
                  {/* Optional: Show company name subtly below if needed, or remove */}
                </div>
              ) : (
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20 p-2">
                  <img src="/logo-icon.png" alt="FL" className="w-full h-full object-contain invert brightness-0" />
                </div>
              )}
            </div>
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
          <NavItem to="/relatorios" icon={FileText} label="Relatórios" isOpen={isSidebarOpen} active={location.pathname === "/relatorios"} />

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
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isSidebarOpen ? "md:ml-[280px]" : "md:ml-20"}`}>
        {/* Top Header */}
        <header className="h-24 bg-white/70 backdrop-blur-xl border-b border-indigo-50/50 sticky top-0 z-30 px-6 md:px-10 flex items-center justify-between shadow-[0_4px_30px_-5px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu size={24} />
            </button>


          </div>

          {/* Nome da Empresa */}
          {nomeEmpresa && (
            <div className="absolute left-1/2 transform -translate-x-1/2 md:static md:transform-none md:ml-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">
                {nomeEmpresa[0].toUpperCase()}
              </div>
              <span className="text-lg font-bold text-slate-800 hidden md:block">{nomeEmpresa}</span>
            </div>
          )}

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
        <main className="flex-1 overflow-y-auto p-2 md:p-4 scroll-smooth">
          <div className="w-full mx-auto animate-fade-in-up">
            {children}
          </div>
        </main>

      </div>

      {/* Chat Widget */}
      <SupportBot />
    </div >
  );
}
