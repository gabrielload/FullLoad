// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { useNavigate } from "react-router-dom";
import { db } from "../services/firebaseConfig";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Package, TrendingUp, CheckCircle, Clock, Calendar, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [carregamentos, setCarregamentos] = useState([]);
  const [planos, setPlanos] = useState([]);
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
        // 1. Carregamentos
        const qCarreg = query(
          collection(db, "carregamentos"),
          where("empresaId", "==", empresaId),
          orderBy("dataEntrada", "desc")
        );
        const snapCarreg = await getDocs(qCarreg);
        const dadosCarreg = snapCarreg.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCarregamentos(dadosCarreg);

        // 2. Planos 3D
        const qPlanos = query(
          collection(db, "empresas", empresaId, "planos_carga"),
          orderBy("dataCriacao", "desc")
        );
        const snapPlanos = await getDocs(qPlanos);
        const dadosPlanos = snapPlanos.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPlanos(dadosPlanos);

        // Métricas
        setTotal(dadosCarreg.length);
        setEmAndamento(dadosCarreg.filter((c) => c.status === "Em andamento").length);
        setFinalizadas(dadosCarreg.filter((c) => c.status === "Finalizado").length);
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
          <MetricCard
            icon={Package} // Or another icon like Box or Grid
            title="Planos 3D"
            value={planos.length}
            gradient="linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)"
            iconBg="bg-gradient-to-br from-pink-500 to-pink-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LISTA DE CARGAS RECENTES */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Cargas Recentes</h2>
                  <p className="text-sm text-slate-500 mt-1">Últimas operações</p>
                </div>
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
                  <p className="text-slate-500 text-lg font-medium">Nenhuma carga</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Descrição</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {carregamentos.slice(0, 5).map((c, idx) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6">
                          <span className="font-medium text-slate-900">{c.descricao}</span>
                        </td>
                        <td className="py-4 px-6">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-slate-600">{c.dataEntrada?.toDate().toLocaleDateString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* LISTA DE PLANOS 3D RECENTES */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Planos 3D Recentes</h2>
                  <p className="text-sm text-slate-500 mt-1">Últimos planejamentos</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                </div>
              ) : planos.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 text-lg font-medium">Nenhum plano 3D</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Nome</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Itens</th>
                      <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {planos.slice(0, 5).map((p, idx) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/fullload3d?planId=${p.id}`)}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 group-hover:text-orange-500 transition-colors">{p.nome}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-slate-700">{p.items?.length || 0}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-slate-600">
                            {new Date(p.dataCriacao).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}
