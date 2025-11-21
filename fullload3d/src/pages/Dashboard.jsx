// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { db } from "../services/firebaseConfig";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

export default function Dashboard() {
  const [carregamentos, setCarregamentos] = useState([]);
  const [total, setTotal] = useState(0);
  const [emAndamento, setEmAndamento] = useState(0);
  const [finalizadas, setFinalizadas] = useState(0);

  const empresaId = localStorage.getItem("empresaId");

  useEffect(() => {
    if (!empresaId) return;

    const carregarDados = async () => {
      try {
        const q = query(
          collection(db, "carregamentos"),
          where("empresaId", "==", empresaId),
          orderBy("dataEntrada", "desc")
        );

        const snap = await getDocs(q);
        const dados = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        setCarregamentos(dados);

        // Métricas
        setTotal(dados.length);
        setEmAndamento(dados.filter((c) => c.status === "Em andamento").length);
        setFinalizadas(dados.filter((c) => c.status === "Finalizado").length);
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      }
    };

    carregarDados();
  }, [empresaId]);

  return (
    <ClientLayout>
      <div className="p-6">
        <h2 className="text-3xl font-bold mb-4">Painel do Cliente</h2>
        <p className="text-gray-600 mb-6">
          Aqui você acompanha suas cargas, status e relatórios.
        </p>

        {/* CARDS DE MÉTRICAS */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl shadow border">
            <h3 className="text-gray-500">Total de Cargas</h3>
            <p className="text-2xl font-bold mt-2">{total}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border">
            <h3 className="text-gray-500">Em Andamento</h3>
            <p className="text-2xl font-bold mt-2">{emAndamento}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow border">
            <h3 className="text-gray-500">Finalizadas</h3>
            <p className="text-2xl font-bold mt-2">{finalizadas}</p>
          </div>
        </div>

        {/* LISTA DE CARGAS RECENTES */}
        <div className="bg-white p-5 rounded-xl shadow border">
          <h3 className="text-xl font-semibold mb-4">Cargas Recentes</h3>
          {carregamentos.length === 0 ? (
            <p className="text-gray-500">Nenhuma carga registrada.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3">Descrição</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Quantidade</th>
                  <th className="py-2 px-3">Entrada</th>
                  <th className="py-2 px-3">Saída</th>
                </tr>
              </thead>
              <tbody>
                {carregamentos.slice(0, 10).map((c) => (
                  <tr key={c.id} className="border-b last:border-none">
                    <td className="py-2 px-3">{c.descricao}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          c.status === "Em andamento"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">{c.quantidade}</td>
                    <td className="py-2 px-3">{c.dataEntrada?.toDate().toLocaleDateString()}</td>
                    <td className="py-2 px-3">
                      {c.dataSaida ? c.dataSaida.toDate().toLocaleDateString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ClientLayout>
  );
}
