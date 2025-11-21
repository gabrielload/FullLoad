// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { db } from "../services/firebaseConfig";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Package, TrendingUp, CheckCircle, Clock, Calendar, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const [carregamentos, setCarregamentos] = useState([]);
  const [total, setTotal] = useState(0);
  const [emAndamento, setEmAndamento] = useState(0);
  const [finalizadas, setFinalizadas] = useState(0);
  const [loading, setLoading] = useState(true);

  const empresaId = localStorage.getItem("empresaId");
  const empresaNome = localStorage.getItem("empresaNome");

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
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [empresaId]);

  const MetricCard = ({ icon: Icon, title, value, gradient, iconBg }) => (
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group">
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity" style={{ background: gradient }}></div>
      <div className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</h3>
        <p className="text-4xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );

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
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Bem-vindo de volta! 👋
          </h1>
          <p className="text-lg text-slate-600">
            Acompanhe suas cargas e operações em tempo real
          </p>
        </div>

        {/* CARDS DE MÉTRICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard
            icon={Package}
            title="Total de Cargas"
            value={total}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
          />
          <MetricCard
            icon={TrendingUp}
            title="Em Andamento"
            value={emAndamento}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            iconBg="bg-gradient-to-br from-amber-500 to-amber-600"
          />
          <MetricCard
            icon={CheckCircle}
            title="Finalizadas"
            value={finalizadas}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            iconBg="bg-gradient-to-br from-emerald-500 to-emerald-600"
          />
        </div>

        {/* LISTA DE CARGAS RECENTES */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Cargas Recentes</h2>
                <p className="text-sm text-slate-500 mt-1">Últimas 10 operações registradas</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors shadow-md hover:shadow-lg">
                Ver Todas
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
              </div>
            ) : carregamentos.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-medium">Nenhuma carga registrada</p>
                <p className="text-slate-400 text-sm mt-2">Suas cargas aparecerão aqui quando forem criadas</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Descrição</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Quantidade</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Entrada</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Saída</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carregamentos.slice(0, 10).map((c, idx) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-md">
                            {idx + 1}
                          </div>
                          <span className="font-medium text-slate-900">{c.descricao}</span>
                        </div>
                      </td>
                      <td className="py-4 px-8">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="py-4 px-8">
                        <span className="font-semibold text-slate-700">{c.quantidade}</span>
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
      </div>
    </ClientLayout>
  );
}
