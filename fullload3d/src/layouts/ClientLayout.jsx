// src/layouts/ClientLayout.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebaseConfig";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function ClientLayout({ children }) {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [nomeEmpresa, setNomeEmpresa] = useState("FullLoad");
  const [logoEmpresa, setLogoEmpresa] = useState("/logo.png");

  useEffect(() => {
    const carregarEmpresa = async () => {
      if (!user) return;

      try {
        // Supondo que cada usuário tenha o ID da empresa salvo em auth ou localStorage
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 🔥 TOPBAR */}
      <div className="w-full bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* LOGO */}
          <div className="flex items-center gap-2">
            <img
              src={logoEmpresa}
              alt={nomeEmpresa}
              className="w-10 h-10 object-contain rounded"
            />
            <span className="font-bold text-xl text-orange-600">{nomeEmpresa}</span>
          </div>

          {/* MENU */}
          <nav className="flex items-center gap-6">
            <Link to="/dashboard" className="text-gray-700 hover:text-orange-600 font-medium">Painel</Link>
            <Link to="/carregamento" className="text-gray-700 hover:text-orange-600 font-medium">Carregamento</Link>
            <Link to="/mercadoria" className="text-gray-700 hover:text-orange-600 font-medium">Mercadoria</Link>
            <Link to="/UserClient" className="text-gray-700 hover:text-orange-600 font-medium">Usuários</Link>
            <Link to="/Caminhao" className="text-gray-700 hover:text-orange-600 font-medium">Caminhões</Link>

            
          </nav>

          {/* USUÁRIO E LOGOUT */}
<div className="flex items-center gap-4">

  {/* 🔥 Botão FullLoad3D */}
  <Link
    to="/FullLoad"
    className="px-4 py-1.5 rounded-lg font-semibold text-white shadow
               bg-gradient-to-r from-orange-600 to-orange-700
               hover:from-orange-700 hover:to-orange-800 
               hover:shadow-md transition-all"
  >
    FullLoad3D
  </Link>

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
      <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
