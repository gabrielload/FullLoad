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
      {/* Left Side - Branding & Visuals */}
      {/* Left Side - Branding & Visuals */}
      <div className="hidden lg:flex w-1/2 bg-[#0F172A] relative overflow-hidden flex-col justify-center p-16 text-white">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
          <svg className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 w-[800px] h-[800px] text-orange-500/10 blur-[100px]" viewBox="0 0 100 100" fill="currentColor">
            <circle cx="50" cy="50" r="50" />
          </svg>
          <svg className="absolute bottom-0 left-0 transform -translate-x-1/3 translate-y-1/3 w-[600px] h-[600px] text-blue-600/10 blur-[80px]" viewBox="0 0 100 100" fill="currentColor">
            <circle cx="50" cy="50" r="50" />
          </svg>
          {/* Tech Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-4 mb-10">
            <img
              src="/logo-icon.png"
              className="w-14 h-auto object-contain"
              alt="FullLoad Icon"
              style={{ filter: "brightness(0) saturate(100%) invert(61%) sepia(35%) saturate(5833%) hue-rotate(352deg) brightness(99%) contrast(96%)" }}
            />
            <span className="text-5xl font-extrabold tracking-tighter leading-none drop-shadow-sm flex gap-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-300">FULL</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">LOAD</span>
            </span>
          </div>
          <h1 className="text-6xl font-bold tracking-tight leading-tight mb-8">
            O futuro da <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-amber-200">
              logística digital
            </span>
          </h1>
          <p className="text-xl text-slate-400 font-light leading-relaxed max-w-md">
            Gerencie suas cargas com precisão milimétrica e visualize em 3D. A inteligência que sua operação precisa.
          </p>
        </div>

        {/* Footer Stats / Trust */}
        <div className="absolute bottom-16 left-16 z-10 border-t border-white/10 pt-8 flex gap-12 text-sm text-slate-400 font-medium">
          <div>
            <span className="block text-2xl font-bold text-white mb-1">3.0</span>
            <span>Versão Atual</span>
          </div>
          <div>
            <span className="block text-2xl font-bold text-white mb-1">100%</span>
            <span>Uptime Garantido</span>
          </div>
          <div>
            <span className="block text-2xl font-bold text-white mb-1">24/7</span>
            <span>Suporte Dedicado</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-white relative">
        <div className="absolute top-0 right-0 p-8">
          {/* Optional: Language selector or help link could go here */}
        </div>

        <div className="w-full max-w-[420px] space-y-10 animate-fade-in-up">
          <div className="text-center lg:text-left">
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Bem-vindo</h2>
            <p className="mt-3 text-slate-500 text-lg">Entre com suas credenciais para acessar o <span className="text-orange-600 font-semibold">FullLoad</span>.</p>
          </div>

          {erro && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-fade-in shadow-sm">
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
              <label className="text-sm font-semibold text-slate-700 block ml-1">E-mail Corporativo</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors duration-200" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all duration-200 outline-none bg-slate-50 hover:bg-white focus:bg-white font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="nome@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-semibold text-slate-700 block">Senha</label>
                <a href="#" className="text-sm font-medium text-orange-600 hover:text-orange-500 transition-colors">Esqueceu a senha?</a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-orange-500 transition-colors duration-200" />
                </div>
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all duration-200 outline-none bg-slate-50 hover:bg-white focus:bg-white font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-4 px-6 rounded-xl shadow-lg shadow-orange-500/20 text-base font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Acessar Plataforma
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              © 2025 FullLoad &bull; Um Sistema da LoadHub - Tecnologia de especialistas para especialistas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
