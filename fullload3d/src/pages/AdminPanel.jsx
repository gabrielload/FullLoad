// src/pages/AdminPanel.jsx
import React, { useEffect, useState } from "react";
import { db } from "../services/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import AdminLayout from "../layouts/AdminLayout";

export default function AdminPanel() {
  const [usuarios, setUsuarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);

  useEffect(() => {
    async function loadData() {
      const userSnap = await getDocs(collection(db, "usuarios"));
      const empresaSnap = await getDocs(collection(db, "empresas"));

      setUsuarios(userSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setEmpresas(empresaSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }

    loadData();
  }, []);

  const usuariosAtivos = usuarios.filter((u) => u.ativo !== false).length;
  const empresasAtivas = empresas.filter((e) => e.ativa !== false).length;
  const empresasDesativadas = empresas.filter((e) => e.ativa === false).length;

  return (
    <AdminLayout>
      <div className="p-6">

        {/* TÍTULO */}
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Dashboard Administrativo
        </h1>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div className="bg-white shadow-md rounded-xl p-6 border-l-4 border-orange-500">
            <h2 className="text-gray-600 text-sm font-semibold">
              Usuários Ativos
            </h2>
            <p className="text-4xl font-bold text-gray-900 mt-1">
              {usuariosAtivos}
            </p>
          </div>

          <div className="bg-white shadow-md rounded-xl p-6 border-l-4 border-green-500">
            <h2 className="text-gray-600 text-sm font-semibold">
              Empresas Ativas
            </h2>
            <p className="text-4xl font-bold text-gray-900 mt-1">
              {empresasAtivas}
            </p>
          </div>

          <div className="bg-white shadow-md rounded-xl p-6 border-l-4 border-red-500">
            <h2 className="text-gray-600 text-sm font-semibold">
              Empresas Desativadas
            </h2>
            <p className="text-4xl font-bold text-gray-900 mt-1">
              {empresasDesativadas}
            </p>
          </div>

        </div>

        {/* TABELA DE USUÁRIOS */}
        <div className="mt-10 bg-white shadow-md rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-800">Usuários</h2>

          <table className="w-full mt-4 border-collapse">
            <thead>
              <tr className="text-left text-gray-600 text-sm border-b">
                <th className="py-2">Nome</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="py-2">{u.nome}</td>
                  <td>{u.email}</td>
                  <td className="uppercase">{u.role}</td>
                  <td
                    className={
                      u.ativo === false ? "text-red-600" : "text-green-600"
                    }
                  >
                    {u.ativo === false ? "Inativo" : "Ativo"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </AdminLayout>
  );
}
