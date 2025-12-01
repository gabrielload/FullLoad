import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./services/firebaseConfig";


import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import Usuarios from "./pages/Usuarios";
import Empresas from "./pages/Empresas";
import Carregamento from "./pages/Carregamento";
import Mercadoria from "./pages/Mercadoria";
import UserClient from "./pages/UserCliente";
import FullLoad from "./pages/FullLoad3d";
import Caminhao from "./pages/Caminhoes";
import MeuPlano from "./pages/MeuPlano";
import Perfil from "./pages/Perfil";
import Configuracoes from "./pages/Configuracoes";
import Ajuda from "./pages/Ajuda";

function ProtectedRoute({ children, allowed }) {
  const role = localStorage.getItem("role");
  const isAuthenticated = localStorage.getItem("uid");

  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!allowed.includes(role)) return <Navigate to="/dashboard" replace />;

  return children;
}

export default function App() {
  const [loading, setLoading] = useState(true);

  // Mantém o usuário logado após F5
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        localStorage.setItem("uid", user.uid);
      } else {
        localStorage.removeItem("uid");
        localStorage.removeItem("role");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-gray-700 text-lg">
        Carregando...
      </div>
    );
  }

  return (

    <Routes>
      {/* Login */}
      <Route path="/" element={<Login />} />

      {/* Dashboard - acessível por user e master */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowed={["user", "master"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Administração - apenas master */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowed={["master"]}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />

      {/* CRUD de usuários – apenas master */}
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute allowed={["master"]}>
            <Usuarios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/empresas"
        element={
          <ProtectedRoute allowed={["master"]}>
            <Empresas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/Carregamento"
        element={
          <ProtectedRoute allowed={["user"]}>
            <Carregamento />
          </ProtectedRoute>
        }
      />

      <Route
        path="/Mercadoria"
        element={
          <ProtectedRoute allowed={["user"]}>
            <Mercadoria />
          </ProtectedRoute>
        }
      />
      <Route
        path="/UserClient"
        element={
          <ProtectedRoute allowed={["user"]}>
            <UserClient />
          </ProtectedRoute>
        }
      />
      <Route
        path="/Caminhao"
        element={
          <ProtectedRoute allowed={["user"]}>
            <Caminhao />
          </ProtectedRoute>
        }
      />


      <Route
        path="/FullLoad"
        element={
          <ProtectedRoute allowed={["user"]}>
            <FullLoad />
          </ProtectedRoute>
        }
      />

      <Route
        path="/meu-plano"
        element={
          <ProtectedRoute allowed={["user"]}>
            <MeuPlano />
          </ProtectedRoute>
        }
      />


      {/* Fallback */}
      <Route path="/perfil" element={<ProtectedRoute allowed={["user", "master"]}><Perfil /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute allowed={["user", "master"]}><Configuracoes /></ProtectedRoute>} />
      <Route path="/ajuda" element={<ProtectedRoute allowed={["user", "master"]}><Ajuda /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>

  );
}
