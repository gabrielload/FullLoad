import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const nav = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");

    try {
      // 1️⃣ Autenticação do usuário no Firebase Auth
      const userCred = await signInWithEmailAndPassword(auth, email, senha);
      const uid = userCred.user.uid;

      // 2️⃣ Busca dados do usuário no Firestore
      const userDoc = await getDoc(doc(db, "usuarios", uid));
      if (!userDoc.exists()) {
        setErro("Usuário não encontrado no Firestore.");
        return;
      }
      const userData = userDoc.data();

      // 3️⃣ Verifica empresa vinculada
      if (!userData.empresaId) {
        setErro("Usuário não está vinculado a nenhuma empresa.");
        return;
      }

      // 4️⃣ Busca dados da empresa
      const empresaDoc = await getDoc(doc(db, "empresas", userData.empresaId));
      if (!empresaDoc.exists()) {
        setErro("Empresa do usuário não encontrada.");
        return;
      }
      const empresaData = empresaDoc.data();

      // 5️⃣ Verifica se a empresa está ativa
      if (!empresaData.ativo) {
        setErro(`A empresa "${empresaData.nome}" está inativa. Contate o administrador.`);
        return;
      }

      // 6️⃣ Salva informações no localStorage
      localStorage.setItem("uid", uid);
      localStorage.setItem("role", userData.role || "user");
      localStorage.setItem("nome", userData.nome || "");
      localStorage.setItem("empresaId", userData.empresaId);
      localStorage.setItem("empresaNome", empresaData.nome || "");
      localStorage.setItem("empresaLogoUrl", empresaData.logoUrl || "/logo.png");

      // 7️⃣ Redireciona conforme role
      nav(userData.role === "master" ? "/admin" : "/dashboard");
    } catch (err) {
      console.error("Erro ao autenticar:", err);
      if (err.code === "auth/user-not-found") {
        setErro("Usuário não encontrado no Auth.");
      } else if (err.code === "auth/wrong-password") {
        setErro("Senha incorreta.");
      } else if (err.code === "auth/invalid-email") {
        setErro("Email inválido.");
      } else {
        setErro("Erro ao autenticar. Veja console para detalhes.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 border border-gray-200">
        <div className="text-center mb-6">
          <img src="/logo.png" className="w-20 mx-auto" alt="FullLoad" />
          <h1 className="text-2xl font-semibold text-gray-900 mt-3">FullLoad 3D</h1>
          <p className="text-gray-500 text-sm mt-1">Acesso ao sistema</p>
        </div>

        {erro && (
          <div className="mb-4 text-center bg-red-100 text-red-600 py-2 rounded-lg">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 font-medium">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 p-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 font-medium">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full mt-1 p-3 rounded-xl border border-gray-300 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 mt-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold shadow-md transition"
          >
            Entrar
          </button>
        </form>

        <p className="text-center text-gray-400 text-xs mt-6">
          © {new Date().getFullYear()} FullLoad. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
