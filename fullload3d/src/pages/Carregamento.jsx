// src/pages/Carregamento.jsx
import React, { useState, useEffect } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { db } from "../services/firebaseConfig";
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";

export default function Carregamento() {
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [status, setStatus] = useState("Em andamento");
  const [carregamentos, setCarregamentos] = useState([]);

  const empresaId = localStorage.getItem("empresaId");

  useEffect(() => {
    if (!empresaId) return;

    const carregarCarregamentos = async () => {
      try {
        const q = query(
          collection(db, "carregamentos"),
          where("empresaId", "==", empresaId),
          orderBy("dataEntrada", "desc")
        );

        const snap = await getDocs(q);
        setCarregamentos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Erro ao carregar carregamentos:", err);
      }
    };

    carregarCarregamentos();
  }, [empresaId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!descricao) {
      alert("Descrição é obrigatória.");
      return;
    }

    try {
      await addDoc(collection(db, "carregamentos"), {
        empresaId,
        descricao,
        quantidade: Number(quantidade),
        status,
        dataEntrada: new Date(),
        dataSaida: status === "Finalizado" ? new Date() : null,
      });

      setDescricao("");
      setQuantidade(1);
      setStatus("Em andamento");

      // Atualiza lista
      const q = query(
        collection(db, "carregamentos"),
        where("empresaId", "==", empresaId),
        orderBy("dataEntrada", "desc")
      );
      const snap = await getDocs(q);
      setCarregamentos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao salvar carregamento:", err);
      alert("Erro ao salvar carregamento. Veja console.");
    }
  };

  return (
    <ClientLayout>
      <div className="p-6">
        <h2 className="text-3xl font-bold mb-4">Novo Carregamento</h2>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow border mb-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full p-2 border rounded mt-1"
              placeholder="Ex: Carga de eletrônicos"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Quantidade</label>
            <input
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full p-2 border rounded mt-1"
              min={1}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2 border rounded mt-1"
            >
              <option value="Em andamento">Em andamento</option>
              <option value="Finalizado">Finalizado</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-500"
          >
            Salvar Carregamento
          </button>
        </form>

        {/* LISTA DE CARGAS */}
        <div className="bg-white p-5 rounded-xl shadow border">
          <h3 className="text-xl font-semibold mb-4">Carregamentos Recentes</h3>
          {carregamentos.length === 0 ? (
            <p className="text-gray-500">Nenhum carregamento registrado.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-3">Descrição</th>
                  <th className="py-2 px-3">Quantidade</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Entrada</th>
                  <th className="py-2 px-3">Saída</th>
                </tr>
              </thead>
              <tbody>
                {carregamentos.slice(0, 10).map((c) => (
                  <tr key={c.id} className="border-b last:border-none">
                    <td className="py-2 px-3">{c.descricao}</td>
                    <td className="py-2 px-3">{c.quantidade}</td>
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
