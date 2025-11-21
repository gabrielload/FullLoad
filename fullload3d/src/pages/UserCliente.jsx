// src/pages/Usuarios.jsx
import React, { useState, useEffect } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { db, auth } from "../services/firebaseConfig";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import Papa from "papaparse";

import { 
  Save,
  Plus,
  Eye,
  EyeOff,
  FileText,
  Trash2
} from "lucide-react";

export default function Usuarios() {
  const empresaId = localStorage.getItem("empresaId");
  const maxUsuarios = 5;

  const [usuarios, setUsuarios] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    cargo: "Operador",
  });
  const [loading, setLoading] = useState(false);
  const [showSenha, setShowSenha] = useState(false);

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
      const usuariosRef = collection(db, "empresas", empresaId, "usuarios");
      const snap = await getDocs(usuariosRef);
      setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    }
  };

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // 👉 RESETAR SENHA
  const resetarSenha = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert(`Link de redefinição enviado para: ${email}`);
    } catch (err) {
      console.error("Erro ao enviar reset:", err);
      alert("Erro ao enviar e-mail de redefinição.");
    }
  };

  // 👉 EXCLUIR USUÁRIO
  const excluirUsuario = async (uid) => {
    if (!window.confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
      await deleteDoc(doc(db, "empresas", empresaId, "usuarios", uid));
      alert("Usuário excluído!");
      carregarUsuarios();
    } catch (err) {
      console.error("Erro ao excluir usuário:", err);
      alert("Erro ao excluir usuário.");
    }
  };

  // 👉 CRIAR USUÁRIO INDIVIDUAL
  const criarUsuario = async () => {
    if (usuarios.length >= maxUsuarios)
      return alert(`Limite de ${maxUsuarios} usuários atingido.`);

    if (!form.nome || !form.email || !form.senha || !form.cargo)
      return alert("Todos os campos são obrigatórios.");

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.senha
      );
      const user = userCredential.user;

      // 🔥 Criar com UID igual
      await setDoc(
        doc(db, "empresas", empresaId, "usuarios", user.uid),
        {
          uid: user.uid,
          nome: form.nome,
          email: form.email,
          cargo: form.cargo,
          criadoEm: new Date(),
        }
      );

      setOpenModal(false);
      setForm({ nome: "", email: "", senha: "", cargo: "Operador" });
      setShowSenha(false);
      carregarUsuarios();
    } catch (err) {
      console.error(err);
      alert("Erro ao criar usuário.");
    } finally {
      setLoading(false);
    }
  };

  // 👉 CSV UPLOAD
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

  // 👉 IMPORTAR CSV
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
              doc(db, "empresas", empresaId, "usuarios", user.uid),
              {
                uid: user.uid,
                nome,
                email,
                cargo,
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

  const btnOrange =
    "bg-orange-500 hover:bg-orange-600 text-white transition-all";

  return (
    <ClientLayout>
      <div className="p-6 space-y-6 bg-[#F8F8F8] min-h-screen">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">Usuários</h2>

          <div className="flex gap-2">
            <button
              onClick={() => setOpenModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded shadow ${btnOrange}`}
              disabled={usuarios.length >= maxUsuarios}
            >
              <Plus size={16} /> Novo Usuário
            </button>

            <button
              onClick={() => setOpenImportModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded shadow ${btnOrange}`}
              disabled={usuarios.length >= maxUsuarios}
            >
              <FileText size={16} /> Importar CSV
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl shadow overflow-x-auto border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100">
              <tr className="text-gray-700">
                <th className="p-3">Nome</th>
                <th>Email</th>
                <th>Cargo</th>
                <th>Criado em</th>
                <th>Resetar Senha</th>
                <th>Excluir</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition-all"
                >
                  <td className="p-2 font-medium text-gray-900">{u.nome}</td>
                  <td className="text-gray-700">{u.email}</td>
                  <td className="text-gray-700">{u.cargo}</td>

                  <td className="text-gray-700">
                    {u.criadoEm?.toDate
                      ? u.criadoEm.toDate().toLocaleDateString()
                      : ""}
                  </td>

                  {/* Resetar senha */}
                  <td className="p-2">
                    <button
                      onClick={() => resetarSenha(u.email)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Resetar senha
                    </button>
                  </td>

                  {/* Lixeira */}
                  <td className="p-2">
                    <button
                      onClick={() => excluirUsuario(u.id)}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Criar Usuário */}
        {openModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
            onClick={() => setOpenModal(false)}
          >
            <div
              className="bg-white p-6 rounded-xl w-[400px] shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Novo Usuário
              </h2>

              <div className="space-y-3">
                <input
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                  placeholder="Nome"
                  value={form.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                />

                <input
                  type="email"
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />

                <div className="relative">
                  <input
                    type={showSenha ? "text" : "password"}
                    className="w-full p-2 border border-gray-300 rounded text-gray-900"
                    placeholder="Senha"
                    value={form.senha}
                    onChange={(e) => handleChange("senha", e.target.value)}
                  />

                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-2 top-2 text-gray-500"
                  >
                    {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <select
                  className="w-full p-2 border border-gray-300 rounded text-gray-900"
                  value={form.cargo}
                  onChange={(e) => handleChange("cargo", e.target.value)}
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Operador">Operador</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setOpenModal(false)}
                  className="px-4 py-2 border rounded text-gray-700"
                >
                  Cancelar
                </button>

                <button
                  onClick={criarUsuario}
                  className={`flex items-center gap-1 px-4 py-2 rounded ${btnOrange}`}
                  disabled={loading}
                >
                  <Save size={16} /> {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Importar CSV */}
        {openImportModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
            onClick={() => {
              setOpenImportModal(false);
              setCsvPreview([]);
            }}
          >
            <div
              className="bg-white p-6 rounded-xl w-[600px] shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4 text-gray-900">
                Importar Usuários CSV
              </h2>

              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleCSVUpload(e.target.files[0])}
                className="mb-4"
              />

              {csvPreview.length > 0 && (
                <div className="mb-4 overflow-x-auto border border-gray-200 rounded">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        {Object.keys(csvPreview[0]).map((key) => (
                          <th
                            key={key}
                            className="p-2 border border-gray-200 text-gray-700"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {Object.values(row).map((val, j) => (
                            <td
                              key={j}
                              className="p-2 border border-gray-200 text-gray-700"
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

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setOpenImportModal(false);
                    setCsvPreview([]);
                  }}
                  className="px-4 py-2 border rounded text-gray-700"
                >
                  Cancelar
                </button>

                <button
                  onClick={importarCSV}
                  className={`flex items-center gap-1 px-4 py-2 rounded ${btnOrange}`}
                >
                  <Save size={16} /> Importar
                </button>
              </div>

              {importStatus && (
                <p className="mt-3 text-gray-700">{importStatus}</p>
              )}
            </div>
          </div>
        )}

      </div>
    </ClientLayout>
  );
}
