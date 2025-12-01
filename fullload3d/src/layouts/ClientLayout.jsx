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
  CreditCard
} from "lucide-react";

export default function ClientLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;

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
        className={`
          fixed md:static inset-y-0 left-0 z-50
          bg-white border-r border-slate-200 shadow-xl md:shadow-none
          transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "w-64" : "w-20"}
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          flex flex-col flex-shrink-0
        `}
      >
        {/* Sidebar Header */}
        <div className={`h-20 flex items-center ${isSidebarOpen ? "px-6 justify-between" : "justify-center"} border-b border-slate-100`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 min-w-[2.5rem] rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg text-white font-bold">
              {logoEmpresa && logoEmpresa !== "/logo.png" ? (
                <img src={logoEmpresa} alt="Logo" className="w-6 h-6 object-contain" />
              ) : (
                "FL"
              )}
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col transition-opacity duration-300">
                <span className="font-bold text-lg truncate text-slate-800">{nomeEmpresa}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Sistema TMS</span>
              </div>
            )}
          </div>

          {/* Desktop Toggle */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>

          {/* Mobile Close */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto scrollbar-thin">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative
                  ${active
                    ? "bg-orange-50 text-orange-600 font-semibold shadow-sm shadow-orange-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }
                  ${!isSidebarOpen && "justify-center"}
                `}
                title={!isSidebarOpen ? label : ""}
              >
                <Icon
                  size={22}
                  className={`
                    transition-colors duration-300
                    ${active ? "text-orange-600 drop-shadow-sm" : "text-slate-400 group-hover:text-slate-600"}
                  `}
                />

                {isSidebarOpen && (
                  <span className="truncate">{label}</span>
                )}

                {/* Active Indicator */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                )}
              </Link>
            );
          })}

          {/* Divider */}
          <div className="my-4 border-t border-slate-100 mx-2" />

          {/* FullLoad3D Special Link */}
          <Link
            to="/FullLoad"
            className={`
              flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden
              bg-slate-900 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] hover:shadow-orange-500/20
              ${!isSidebarOpen && "justify-center px-0"}
            `}
          >
            {/* Gradient Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900 z-0" />
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 z-0" />

            <BoxIcon size={22} className="text-orange-400 relative z-10" />
            {isSidebarOpen && (
              <span className="font-bold tracking-wide relative z-10">FullLoad3D</span>
            )}
          </Link>
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className={`flex items-center ${isSidebarOpen ? "gap-3" : "justify-center"}`}>
            <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold shadow-sm">
              {(user?.displayName || user?.email || "U")[0].toUpperCase()}
            </div>

            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-slate-700 truncate">
                  {user?.displayName || user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-slate-400 truncate">Online</p>
              </div>
            )}

            {isSidebarOpen && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu size={24} />
            </button>

            <div className="hidden md:flex items-center gap-3 text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 transition-all w-64">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar..."
                className="bg-transparent border-none outline-none text-sm text-slate-700 w-full placeholder:text-slate-400"
              />
            </div>
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
    </div>
  );
}
