// src/pages/Usuarios.jsx
import React, { useState, useEffect } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { db, auth } from "../services/firebaseConfig";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  query,
  where
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  getAuth as getAuthSecondary,
  createUserWithEmailAndPassword as createUserSecondary,
  updateProfile
} from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { firebaseConfig } from "../services/firebaseConfig";
import Papa from "papaparse";

import {
  Save,
  Plus,
  Eye,
  EyeOff,
  FileText,
  Trash2,
  User,
  Mail,
  Shield,
  Loader2,
  CheckCircle,
  Users
} from "lucide-react";

export default function Usuarios() {
  const empresaId = localStorage.getItem("empresaId");
  const userCargo = localStorage.getItem("userCargo");
  const userRole = localStorage.getItem("role");
  const maxUsuarios = 5;

  const [usuarios, setUsuarios] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    cargo: "Operador",
    setor: "",
  });
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [success, setSuccess] = useState("");

  // CSV
  const [openImportModal, setOpenImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [importStatus, setImportStatus] = useState("");

  useEffect(() => {
    if (!empresaId) return;
    carregarUsuarios();
  }, [empresaId]);

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      // Query root 'usuarios' collection filtered by empresaId
      const q = query(collection(db, "usuarios"), where("empresaId", "==", empresaId));
      const snap = await getDocs(q);
      setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const resetarSenha = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(`Link de redefinição enviado para: ${email}`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Erro ao enviar reset:", err);
      alert("Erro ao enviar e-mail de redefinição.");
    }
  };

  const excluirUsuario = async (uid) => {
    if (!window.confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
      setLoading(true);
      // Delete from root 'usuarios' collection
      await deleteDoc(doc(db, "usuarios", uid));
      setSuccess("Usuário excluído!");
      setTimeout(() => setSuccess(""), 3000);
      carregarUsuarios();
    } catch (err) {
      console.error("Erro ao excluir usuário:", err);
      alert("Erro ao excluir usuário.");
    } finally {
      setLoading(false);
    }
  };

  const criarUsuario = async () => {
    if (usuarios.length >= maxUsuarios)
      return alert(`Limite de ${maxUsuarios} usuários atingido.`);

    if (!form.nome || !form.email || !form.senha || !form.cargo)
      return alert("Todos os campos são obrigatórios.");

    setLoading(true);
    try {
      // Create secondary app to avoid logging out the current user
      const secondaryApp = initializeApp(firebaseConfig, "SecondaryClient");
      const secondaryAuth = getAuthSecondary(secondaryApp);

      const userCredential = await createUserSecondary(
        secondaryAuth,
        form.email,
        form.senha
      );
      const user = userCredential.user;
      await updateProfile(user, { displayName: form.nome });

      // Cleanup secondary app
      await deleteApp(secondaryApp);

      await setDoc(
        doc(db, "usuarios", user.uid),
        {
          uid: user.uid,
          nome: form.nome,
          email: form.email,
          email: form.email,
          cargo: form.cargo,
          setor: form.setor,
          empresaId: empresaId, // Important: Link to company
          role: "user", // Default role for operators
          ativo: true,
          criadoEm: new Date(),
        }
      );

      setOpenModal(false);
      setOpenModal(false);
      setForm({ nome: "", email: "", senha: "", cargo: "Operador", setor: "" });
      setShowSenha(false);
      setShowSenha(false);
      setSuccess("Usuário criado com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
      carregarUsuarios();
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        alert("Este email já está em uso por outro usuário.");
      } else if (err.code === "auth/weak-password") {
        alert("A senha deve ter pelo menos 6 caracteres.");
      } else {
        alert(`Erro ao criar usuário: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = (file) => {
    if (!file) return;
    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (results) => setCsvPreview(results.data),
    });
  };

  const importarCSV = async () => {
    if (!csvFile) return alert("Selecione um arquivo CSV!");
    if (usuarios.length >= maxUsuarios)
      return alert(`Limite de ${maxUsuarios} usuários atingido.`);

    setImportStatus("Processando...");

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          for (const row of results.data) {
            if (usuarios.length >= maxUsuarios) break;

            const nome = row.nome || "";
            const email = row.email || "";
            const senha = row.senha || "";
            const cargo = row.cargo || "Operador";

            if (!nome || !email || !senha) continue;

            const userCredential = await createUserWithEmailAndPassword(
              auth,
              email,
              senha
            );
            const user = userCredential.user;

            await setDoc(
              doc(db, "usuarios", user.uid),
              {
                uid: user.uid,
                nome,
                email,
                cargo,
                empresaId: empresaId,
                role: "user",
                ativo: true,
                criadoEm: new Date(),
              }
            );

            usuarios.push({});
          }

          setImportStatus("Importação concluída!");
          setCsvFile(null);
          setCsvPreview([]);
          carregarUsuarios();
        } catch (err) {
          console.error(err);
          setImportStatus("Erro durante importação.");
        }
      },
    });
  };

  const CargoBadge = ({ cargo }) => {
    const config = {
      Administrador: "bg-purple-100 text-purple-700 border-purple-200",
      Supervisor: "bg-blue-100 text-blue-700 border-blue-200",
      Operador: "bg-green-100 text-green-700 border-green-200",
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config[cargo] || config.Operador}`}>
        <Shield className="w-3 h-3" />
        {cargo}
      </span>
    );
  };

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Users className="w-10 h-10 text-orange-500" />
              Usuários
            </h1>
            <p className="text-lg text-slate-600">Gerencie os usuários da empresa</p>
          </div>

          <div className="flex gap-3">
            {(userCargo === "Administrador" || userRole === "admin") && (
              <>
                <button
                  onClick={() => setOpenModal(true)}
                  disabled={usuarios.length >= maxUsuarios}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg shadow-orange-500/30 text-base font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={20} /> Novo Usuário
                </button>

                <button
                  onClick={() => setOpenImportModal(true)}
                  disabled={usuarios.length >= maxUsuarios}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg shadow-slate-500/30 text-base font-bold text-white bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-700 hover:to-slate-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileText size={20} /> Importar CSV
                </button>
              </>
            )}
          </div>
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

        {/* Table */}
        {userCargo !== "Administrador" && userRole !== "admin" ? (
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center border border-slate-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Restrito</h2>
            <p className="text-slate-500 max-w-md mx-auto">
              Apenas administradores podem visualizar e gerenciar usuários. Entre em contato com seu gestor se precisar de acesso.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <h2 className="text-2xl font-bold text-slate-900">Lista de Usuários</h2>
              <p className="text-sm text-slate-500 mt-1">{usuarios.length} de {maxUsuarios} usuários</p>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                </div>
              ) : usuarios.length === 0 ? (
                <div className="text-center py-16">
                  <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg font-medium">Nenhum usuário cadastrado</p>
                  <p className="text-slate-400 text-sm mt-2">Adicione seu primeiro usuário</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Nome</th>
                      <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Email</th>
                      <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Cargo</th>
                      <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Setor</th>
                      <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Criado em</th>
                      <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {usuarios.map((u, idx) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-8">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-md">
                              {u.nome[0].toUpperCase()}
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
                          <CargoBadge cargo={u.cargo} />
                        </td>
                        <td className="py-4 px-8 text-slate-600 text-sm">
                          {u.setor || "-"}
                        </td>
                        <td className="py-4 px-8 text-slate-600 text-sm">
                          {u.criadoEm?.toDate
                            ? u.criadoEm.toDate().toLocaleDateString()
                            : ""}
                        </td>

                        <td className="py-4 px-8">
                          <div className="flex gap-2">
                            <button
                              onClick={() => resetarSenha(u.email)}
                              className="px-3 py-1.5 rounded-lg border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 text-blue-600 font-semibold text-sm transition-all"
                            >
                              Resetar senha
                            </button>

                            <button
                              onClick={() => excluirUsuario(u.id)}
                              className="p-2 rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white shadow-md transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Modal Criar Usuário */}
        {openModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setOpenModal(false)}
          >
            <div
              className="bg-white p-5 rounded-3xl w-full max-w-[500px] shadow-2xl max-h-[80vh] overflow-y-auto custom-scrollbar flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4 text-slate-900 shrink-0">
                Novo Usuário
              </h2>

              <div className="space-y-3 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Setor</label>
                  <input
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-orange-500 transition-colors"
                    placeholder="Ex: Logística"
                    value={form.setor}
                    onChange={(e) => handleChange("setor", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome</label>
                  <input
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                    placeholder="Nome completo"
                    value={form.nome}
                    onChange={(e) => handleChange("nome", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                    placeholder="email@exemplo.com"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
                  <div className="relative">
                    <input
                      type={showSenha ? "text" : "password"}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                      placeholder="Senha segura"
                      value={form.senha}
                      onChange={(e) => handleChange("senha", e.target.value)}
                    />

                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Cargo</label>
                  <select
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                    value={form.cargo}
                    onChange={(e) => handleChange("cargo", e.target.value)}
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Operador">Operador</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 shrink-0">
                <button
                  onClick={() => setOpenModal(false)}
                  className="px-6 py-2.5 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>

                <button
                  onClick={criarUsuario}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold shadow-lg transition-all disabled:opacity-70"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save size={16} /> Salvar</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Importar CSV */}
        {openImportModal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => {
              setOpenImportModal(false);
              setCsvPreview([]);
            }}
          >
            <div
              className="bg-white p-8 rounded-3xl w-full max-w-[700px] shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6 text-slate-900">
                Importar Usuários CSV
              </h2>

              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleCSVUpload(e.target.files[0])}
                className="mb-4 w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50"
              />

              {csvPreview.length > 0 && (
                <div className="mb-4 overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                      <tr>
                        {Object.keys(csvPreview[0]).map((key) => (
                          <th
                            key={key}
                            className="p-3 border-b border-slate-200 text-slate-700 font-semibold"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          {Object.values(row).map((val, j) => (
                            <td
                              key={j}
                              className="p-3 border-b border-slate-100 text-slate-700"
                            >
                              {val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setOpenImportModal(false);
                    setCsvPreview([]);
                  }}
                  className="px-6 py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>

                <button
                  onClick={importarCSV}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold shadow-lg transition-all"
                >
                  <Save size={16} /> Importar
                </button>
              </div>

              {importStatus && (
                <p className="mt-4 text-slate-700 font-medium">{importStatus}</p>
              )}
            </div>
          </div>
        )}

      </div>
    </ClientLayout>
  );
}
