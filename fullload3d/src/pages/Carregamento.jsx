// src/pages/Carregamento.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../layouts/ClientLayout";
import { db } from "../services/firebaseConfig";
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { Package, Plus, Calendar, Clock, CheckCircle, Loader2 } from "lucide-react";

export default function Carregamento() {
  const navigate = useNavigate();
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [status, setStatus] = useState("Em andamento");
  const [carregamentos, setCarregamentos] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const empresaId = localStorage.getItem("empresaId");

  useEffect(() => {
    if (!empresaId) return;

    const carregarDados = async () => {
      try {
        setLoading(true);

        // 1. Carregamentos
        const qCarreg = query(
          collection(db, "carregamentos"),
          where("empresaId", "==", empresaId),
          orderBy("dataEntrada", "desc")
        );
        const snapCarreg = await getDocs(qCarreg);
        setCarregamentos(snapCarreg.docs.map((d) => ({ id: d.id, ...d.data() })));

        // 2. Planos 3D
        const qPlanos = query(
          collection(db, "empresas", empresaId, "planos_carga"),
          orderBy("dataCriacao", "desc")
        );
        const snapPlanos = await getDocs(qPlanos);
        setPlanos(snapPlanos.docs.map((d) => ({ id: d.id, ...d.data() })));

      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [empresaId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!descricao) {
      alert("Descrição é obrigatória.");
      return;
    }

    try {
      setLoading(true);
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

      setSuccess("Carregamento salvo com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Erro ao salvar carregamento:", err);
      alert("Erro ao salvar carregamento. Veja console.");
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      "Em andamento": "bg-amber-100 text-amber-700 border-amber-200",
      "Finalizado": "bg-emerald-100 text-emerald-700 border-emerald-200",
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
        {status === "Em andamento" ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
        {status}
      </span>
    );
  };

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Package className="w-10 h-10 text-orange-500" />
            Novo Carregamento
          </h1>
          <p className="text-lg text-slate-600">
            Registre e acompanhe suas operações de carga
          </p>
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

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Dados do Carregamento</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Descrição</label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                placeholder="Ex: Carga de eletrônicos"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Quantidade</label>
                <input
                  type="number"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                  min={1}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                >
                  <option value="Em andamento">Em andamento</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl shadow-lg shadow-orange-500/30 text-base font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Salvar Carregamento
                </>
              )}
            </button>
          </div>
        </form>

        {/* Lista de Carregamentos */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="text-2xl font-bold text-slate-900">Carregamentos Recentes</h2>
            <p className="text-sm text-slate-500 mt-1">Histórico de operações registradas</p>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
              </div>
            ) : carregamentos.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-medium">Nenhum carregamento registrado</p>
                <p className="text-slate-400 text-sm mt-2">Seus carregamentos aparecerão aqui</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Descrição</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Quantidade</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Entrada</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Saída</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carregamentos.slice(0, 10).map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-md">
                            {idx + 1}
                          </div>
                          <span className="font-medium text-slate-900">{c.descricao}</span>
                        </div>
                      </td>
                      <td className="py-4 px-8">
                        <span className="font-semibold text-slate-700">{c.quantidade}</span>
                      </td>
                      <td className="py-4 px-8">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">{c.dataEntrada?.toDate().toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">
                            {c.dataSaida ? c.dataSaida.toDate().toLocaleDateString() : "-"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          </div>
        </div>

        {/* Lista de Planos 3D Salvos */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden mt-8">
          <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="text-2xl font-bold text-slate-900">Planos 3D Salvos</h2>
            <p className="text-sm text-slate-500 mt-1">Histórico de planejamentos 3D</p>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
              </div>
            ) : planos.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-medium">Nenhum plano 3D salvo</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Nome do Plano</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Data</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Baú (m)</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Itens</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {planos.map((p, idx) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/fullload3d?planId=${p.id}`)}
                    >
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold shadow-sm group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                            {idx + 1}
                          </div>
                          <span className="font-medium text-slate-900 group-hover:text-orange-500 transition-colors">{p.nome}</span>
                        </div>
                      </td>
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">
                            {new Date(p.dataCriacao).toLocaleDateString()} {new Date(p.dataCriacao).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-8">
                        <span className="text-sm text-slate-600">
                          {p.bau ? `${p.bau.L} x ${p.bau.W} x ${p.bau.H}` : "-"}
                        </span>
                      </td>
                      <td className="py-4 px-8">
                        <span className="font-semibold text-slate-700">{p.items?.length || 0}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
