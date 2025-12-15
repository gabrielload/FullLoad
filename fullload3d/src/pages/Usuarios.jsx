// src/pages/Usuarios.jsx (Admin Version)
import React, { useEffect, useState } from "react";
import { db, auth } from "../services/firebaseConfig";
import {
  collection,
  getDocs,
  setDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth as getAuthSecondary, createUserWithEmailAndPassword as createUserSecondary } from "firebase/auth";
import { firebaseConfig } from "../services/firebaseConfig";
import AdminLayout from "../layouts/AdminLayout";
import { Users, Plus, Edit, Save, X, Shield, Mail, Building, Loader2, CheckCircle, User } from "lucide-react";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [empresaFiltro, setEmpresaFiltro] = useState("all");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  // Formulário
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    role: "user",
    empresaId: "",
    ativo: true,
  });

  useEffect(() => {
    carregarEmpresas();
    carregarUsuarios();
  }, []);

  const carregarEmpresas = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "empresas"));
      setEmpresas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar empresas:", err);
    } finally {
      setLoading(false);
    }
  };

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "usuarios"));
      setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCriar = () => {
    setEditUser(null);
    setForm({
      nome: "",
      email: "",
      senha: "",
      role: "user",
      empresaId: "",
      ativo: true,
    });
    setOpenModal(true);
  };

  const abrirModalEditar = (user) => {
    setEditUser(user);
    setForm({
      nome: user.nome || "",
      email: user.email || "",
      senha: "",
      role: user.role || "user",
      empresaId: user.empresaId || "",
      ativo: user.ativo !== undefined ? user.ativo : true,
    });
    setOpenModal(true);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const salvarUsuario = async () => {
    if (!form.nome || !form.email || !form.empresaId) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setLoading(true);
      if (editUser) {
        const userRef = doc(db, "usuarios", editUser.id);
        await updateDoc(userRef, {
          nome: form.nome,
          role: form.role,
          cargo: form.role === "admin" ? "Administrador" : "Operador",
          empresaId: form.empresaId,
          ativo: form.ativo,
        });
        setSuccess("Usuário atualizado com sucesso!");
      } else {
        if (!form.senha) {
          alert("Senha é obrigatória para criar novo usuário.");
          return;
        }

        // Create secondary app to avoid logging out admin
        const secondaryApp = initializeApp(firebaseConfig, "Secondary");
        const secondaryAuth = getAuthSecondary(secondaryApp);

        const userCredential = await createUserSecondary(
          secondaryAuth,
          form.email,
          form.senha
        );
        const user = userCredential.user;

        // Cleanup
        await deleteApp(secondaryApp);

        await setDoc(doc(db, "usuarios", user.uid), {
          uid: user.uid,
          nome: form.nome,
          email: form.email,
          role: form.role,
          cargo: form.role === "admin" ? "Administrador" : "Operador",
          empresaId: form.empresaId,
          ativo: form.ativo,
          criadoEm: new Date(),
        });
        setSuccess("Usuário criado com sucesso!");
      }

      setTimeout(() => setSuccess(""), 3000);
      setOpenModal(false);
      carregarUsuarios();
    } catch (err) {
      console.error("Erro ao salvar usuário:", err);
      alert(`Erro ao salvar usuário: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const usuariosFiltrados =
    empresaFiltro === "all"
      ? usuarios
      : usuarios.filter((u) => u.empresaId === empresaFiltro);

  const getNomeEmpresa = (empresaId) => {
    const empresa = empresas.find((e) => e.id === empresaId);
    return empresa?.nome || "Sem empresa";
  };

  const RoleBadge = ({ role }) => {
    const config = {
      admin: { label: "Admin", color: "bg-purple-100 text-purple-700 border-purple-200" },
      user: { label: "Usuário", color: "bg-blue-100 text-blue-700 border-blue-200" },
    };
    const { label, color } = config[role] || config.user;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>
        <Shield className="w-3 h-3" />
        {label}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Users className="w-10 h-10 text-orange-500" />
              Gerenciamento de Usuários
            </h1>
            <p className="text-lg text-slate-600">Administre todos os usuários do sistema</p>
          </div>

          <button
            onClick={abrirModalCriar}
            className="flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg shadow-orange-500/30 text-base font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 transition-all transform hover:scale-105"
          >
            <Plus size={20} /> Novo Usuário
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <p className="text-sm text-emerald-700 font-medium">{success}</p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="mb-6 bg-white rounded-xl shadow-md border border-slate-100 p-6">
          <label className="block text-sm font-semibold text-slate-700 mb-3">Filtrar por Empresa</label>
          <select
            className="w-full md:w-96 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
            value={empresaFiltro}
            onChange={(e) => setEmpresaFiltro(e.target.value)}
          >
            <option value="all">Todas as empresas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="text-2xl font-bold text-slate-900">Usuários Cadastrados</h2>
            <p className="text-sm text-slate-500 mt-1">{usuariosFiltrados.length} usuários encontrados</p>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
              </div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="text-center py-16">
                <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-medium">Nenhum usuário encontrado</p>
                <p className="text-slate-400 text-sm mt-2">Adicione um novo usuário ou ajuste os filtros</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Nome</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Email</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Empresa</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Função</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {usuariosFiltrados.map((u, idx) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-md">
                            {(u.nome || "U")[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-900">{u.nome}</span>
                        </div>
                      </td>
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">{u.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Building className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">{getNomeEmpresa(u.empresaId)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-8">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="py-4 px-8">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.ativo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {u.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="py-4 px-8">
                        <button
                          onClick={() => abrirModalEditar(u)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-semibold transition-all"
                        >
                          <Edit size={14} /> Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal */}
        {openModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
            onClick={() => setOpenModal(false)}
          >
            <div
              className="bg-white p-8 rounded-2xl w-[550px] shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6 text-slate-900">
                {editUser ? "Editar Usuário" : "Novo Usuário"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nome</label>
                  <input
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                    placeholder="Nome completo"
                    value={form.nome}
                    onChange={(e) => handleChange("nome", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                    placeholder="email@exemplo.com"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    disabled={!!editUser}
                  />
                </div>

                {!editUser && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Senha</label>
                    <input
                      type="password"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                      placeholder="Senha segura"
                      value={form.senha}
                      onChange={(e) => handleChange("senha", e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Empresa</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                    value={form.empresaId}
                    onChange={(e) => handleChange("empresaId", e.target.value)}
                  >
                    <option value="">Selecione uma empresa</option>
                    {empresas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Função</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                    value={form.role}
                    onChange={(e) => handleChange("role", e.target.value)}
                  >
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ativo"
                    className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                    checked={form.ativo}
                    onChange={(e) => handleChange("ativo", e.target.checked)}
                  />
                  <label htmlFor="ativo" className="text-sm font-semibold text-slate-700">
                    Usuário ativo
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setOpenModal(false)}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                >
                  <X size={16} /> Cancelar
                </button>

                <button
                  onClick={salvarUsuario}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold shadow-lg transition-all disabled:opacity-70"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save size={16} /> Salvar</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
