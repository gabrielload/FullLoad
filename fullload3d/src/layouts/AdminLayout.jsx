// src/layouts/AdminLayout.jsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../services/firebaseConfig";
import { signOut } from "firebase/auth";

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">

      {/* 🔥 TOPBAR */}
      <div className="w-full bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">

          {/* LOGO */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="FullLoad" className="w-10" />
            <span className="font-bold text-xl text-orange-600">FullLoad</span>
          </div>

          {/* MENU */}
          <nav className="flex items-center gap-6">
            <Link to="/admin" className="text-gray-700 hover:text-orange-600 font-medium">
              Painel
            </Link>
            <Link to="/usuarios" className="text-gray-700 hover:text-orange-600 font-medium">
              Usuários
            </Link>
            <Link to="/empresas" className="text-gray-700 hover:text-orange-600 font-medium">
              Empresas
            </Link>
            <Link to="/cargas" className="text-gray-700 hover:text-orange-600 font-medium">
              Cargas
            </Link>
          </nav>

          {/* USUÁRIO E LOGOUT */}
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium">
              {user ? user.displayName || user.email : "Convidado"}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-sm"
            >
              Sair
            </button>
          </div>

        </div>
      </div>

      {/* CONTEÚDO DAS PÁGINAS */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </div>

    </div>
  );
}
