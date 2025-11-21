// src/layouts/ClientLayout.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../services/firebaseConfig";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Home, Package, Truck, Box, Users, LogOut, Box as BoxIcon } from "lucide-react";

export default function ClientLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;

  const [nomeEmpresa, setNomeEmpresa] = useState("FullLoad");
  const [logoEmpresa, setLogoEmpresa] = useState("/logo.png");

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Modern Topbar */}
      <div className="w-full bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <img
                  src={logoEmpresa}
                  alt={nomeEmpresa}
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<span class="text-white font-bold text-xl">FL</span>';
                  }}
                />
              </div>
              <div>
                <span className="font-bold text-xl text-slate-900">{nomeEmpresa}</span>
                <p className="text-xs text-slate-500">Sistema de Gestão</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${isActive(path)
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </nav>

            {/* User Actions */}
            <div className="flex items-center gap-3">
              {/* FullLoad3D Button */}
              <Link
                to="/FullLoad"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white shadow-lg shadow-orange-500/30 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 transition-all transform hover:scale-105"
              >
                <BoxIcon className="w-5 h-5" />
                FullLoad3D
              </Link>

              {/* User Info */}
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-sm">
                  {(user?.displayName || user?.email || "U")[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {user?.displayName || user?.email?.split('@')[0] || "Usuário"}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-lg font-semibold shadow-md transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden mt-4 flex gap-2 overflow-x-auto pb-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${isActive(path)
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-slate-100"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full">{children}</div>
    </div>
  );
}
