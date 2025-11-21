// src/pages/Usuarios.jsx
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
import AdminLayout from "../layouts/AdminLayout";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [empresaFiltro, setEmpresaFiltro] = useState("all");

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
    const snap = await getDocs(collection(db, "empresas"));
    setEmpresas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const carregarUsuarios = async () => {
    const snap = await getDocs(collection(db, "usuarios"));
    setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
      nome: user.nome,
      email: user.email,
      senha: "",
      role: user.role,
      empresaId: user.empresaId,
      ativo: user.ativo,
    });
    setOpenModal(true);
  };

  const salvarUsuario = async () => {
    // Validações básicas
    if (!form.nome) return alert("Nome obrigatório");
    if (!form.email) return alert("Email obrigatório");
    if (!editUser && !form.senha) return alert("Senha obrigatória para novo usuário");
    if (!form.empresaId) return alert("Empresa obrigatória");

    try {
      if (editUser) {
        // Atualizar usuário existente
        await updateDoc(doc(db, "usuarios", editUser.id), form);
      } else {
        // Criar usuário no Auth
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.senha);

        // Salvar no Firestore usando uid como id do documento
        await setDoc(doc(db, "usuarios", cred.user.uid), {
          nome: form.nome,
          email: form.email,
          role: form.role,
          empresaId: form.empresaId,
          ativo: form.ativo,
          criadoEm: new Date(),
        });
      }

      carregarUsuarios();
      setOpenModal(false);
    } catch (err) {
      console.error("Erro ao salvar usuário:", err);
      alert("Erro ao salvar usuário. Verifique os dados e tente novamente.");
    }
  };

  const filtrarLista =
    empresaFiltro === "all"
      ? usuarios
      : usuarios.filter((u) => u.empresaId === empresaFiltro);

  return (
    <AdminLayout>
      <div className="p-6">

        {/* CARD DE AÇÕES */}
        <div className="bg-white p-5 rounded-xl shadow border mb-6 flex justify-between items-center">
          <div className="flex gap-3 items-center">
            <select
              value={empresaFiltro}
              onChange={(e) => setEmpresaFiltro(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="all">Todas as empresas</option>
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nome}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={abrirModalCriar}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded"
          >
            + Novo Usuário
          </button>
        </div>

        {/* LISTA */}
        <div className="bg-white p-5 rounded-xl shadow border">
          <table className="w-full text-left">
            <thead className="border-b">
              <tr className="text-gray-600">
                <th className="py-3">Nome</th>
                <th>Email</th>
                <th>Empresa</th>
                <th>Role</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {filtrarLista.map((u) => (
                <tr key={u.id} className="border-b last:border-none">
                  <td className="py-3">{u.nome}</td>
                  <td>{u.email}</td>
                  <td>{empresas.find((e) => e.id === u.empresaId)?.nome || "-"}</td>
                  <td className="uppercase">{u.role}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        u.ativo
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => abrirModalEditar(u)}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {openModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-xl w-[420px] shadow-xl">
            <h2 className="text-xl font-semibold mb-4">
              {editUser ? "Editar Usuário" : "Novo Usuário"}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-sm">Nome</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="text-sm">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-2 border rounded"
                  disabled={editUser}
                />
              </div>

              {!editUser && (
                <div>
                  <label className="text-sm">Senha</label>
                  <input
                    type="password"
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              )}

              <div>
                <label className="text-sm">Empresa</label>
                <select
                  value={form.empresaId}
                  onChange={(e) =>
                    setForm({ ...form, empresaId: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                >
                  <option value="">Selecione...</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm">Função</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Admin empresa</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-5 gap-2">
              <button
                onClick={() => setOpenModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancelar
              </button>
              <button
                onClick={salvarUsuario}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
