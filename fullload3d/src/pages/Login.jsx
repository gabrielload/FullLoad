import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      // 1️⃣ Autenticação do usuário no Firebase Auth
      const userCred = await signInWithEmailAndPassword(auth, email, senha);
      const uid = userCred.user.uid;

      // 2️⃣ Busca dados do usuário no Firestore
      const userDoc = await getDoc(doc(db, "usuarios", uid));
      if (!userDoc.exists()) {
        setErro("Usuário não encontrado no Firestore.");
        setLoading(false);
        return;
      }
      const userData = userDoc.data();

      // 3️⃣ Verifica empresa vinculada
      if (!userData.empresaId) {
        setErro("Usuário não está vinculado a nenhuma empresa.");
        setLoading(false);
        return;
      }

      // 4️⃣ Busca dados da empresa
      const empresaDoc = await getDoc(doc(db, "empresas", userData.empresaId));
      if (!empresaDoc.exists()) {
        setErro("Empresa do usuário não encontrada.");
        setLoading(false);
        return;
      }
      const empresaData = empresaDoc.data();

      // 5️⃣ Verifica se a empresa está ativa
      if (!empresaData.ativo) {
        setErro(`A empresa "${empresaData.nome}" está inativa. Contate o administrador.`);
        setLoading(false);
        return;
      }

      // 6️⃣ Salva informações no localStorage
      localStorage.setItem("uid", uid);
      localStorage.setItem("role", userData.role || "user");
      localStorage.setItem("userCargo", userData.cargo || "Operador");
      localStorage.setItem("nome", userData.nome || "");
      localStorage.setItem("empresaId", userData.empresaId);
      localStorage.setItem("empresaNome", empresaData.nome || "");
      localStorage.setItem("empresaLogoUrl", empresaData.logoUrl || "/logo.png");

      // 7️⃣ Redireciona conforme role
      nav(userData.role === "master" ? "/admin" : "/dashboard");
    } catch (err) {
      console.error("Erro ao autenticar:", err);
      setLoading(false);
      if (err.code === "auth/user-not-found") {
        setErro("Usuário não encontrado no Auth.");
      } else if (err.code === "auth/wrong-password") {
        setErro("Senha incorreta.");
      } else if (err.code === "auth/invalid-email") {
        setErro("Email inválido.");
      } else {
        setErro("Erro ao autenticar. Tente novamente.");
      }
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Left Side - Branding & Visuals */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden items-center justify-center p-16 text-white">
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-orange-500/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="mb-12">
            <img src="/logo-orange.png" className="w-64 h-auto mb-8 object-contain drop-shadow-2xl" alt="FullLoad" />
            <h1 className="text-6xl font-bold mb-6 tracking-tight leading-tight">
              Logística <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-200">
                Inteligente
              </span>
            </h1>
            <p className="text-xl text-slate-300 font-light leading-relaxed">
              A plataforma definitiva para otimização de cargas e visualização 3D. Transforme sua operação hoje.
            </p>
          </div>

          <div className="flex gap-4 text-sm font-medium text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              Sistema Online
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              Versão 3.0
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-white">
        <div className="w-full max-w-md space-y-10">
          <div className="text-center lg:text-left">
            <img src="/logo-black.png" alt="FullLoad" className="h-12 w-auto mb-8 mx-auto lg:mx-0" />
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Bem-vindo</h2>
            <p className="mt-3 text-slate-500 text-lg">Entre com suas credenciais para acessar.</p>
          </div>

          {erro && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-fade-in">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 font-medium">{erro}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">E-mail</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="nome@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 block">Senha</label>
                <a href="#" className="text-sm font-medium text-orange-600 hover:text-orange-500 transition-colors">Esqueceu?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
                </div>
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-4 px-6 rounded-xl shadow-lg shadow-orange-500/30 text-base font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              © 2025 LoadHub <br /> Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
