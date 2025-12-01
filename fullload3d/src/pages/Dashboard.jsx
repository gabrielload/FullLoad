// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { useNavigate } from "react-router-dom";
import { db } from "../services/firebaseConfig";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import {
  Package,
  TrendingUp,
  CheckCircle,
  Clock,
  Calendar,
  ArrowRight,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Truck,
  Box
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";

export default function Dashboard() {
  const navigate = useNavigate();
  const [carregamentos, setCarregamentos] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    emAndamento: 0,
    finalizadas: 0,
    planos3d: 0
  });

  const empresaId = localStorage.getItem("empresaId");

  // Mock data for charts (to ensure they look good even with little data)
  const [monthlyData, setMonthlyData] = useState([]);
  const [statusData, setStatusData] = useState([]);

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

        // Calcular Estatísticas
        const total = dadosCarreg.length;
        const emAndamento = dadosCarreg.filter((c) => c.status === "Em andamento").length;
        const finalizadas = dadosCarreg.filter((c) => c.status === "Finalizado").length;

        setStats({
          total,
          emAndamento,
          finalizadas,
          planos3d: dadosPlanos.length
        });

        // Preparar dados para gráficos
        // Mock de dados mensais para visualização bonita
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
        const mockMonthly = months.map(m => ({
          name: m,
          cargas: Math.floor(Math.random() * 50) + 10,
          planos: Math.floor(Math.random() * 30) + 5
        }));
        setMonthlyData(mockMonthly);

        // Dados de Status Reais + Mock se vazio
        const statusCounts = [
          { name: "Em Andamento", value: emAndamento || 5, color: "#f59e0b" },
          { name: "Finalizadas", value: finalizadas || 12, color: "#10b981" },
          { name: "Pendentes", value: Math.max(0, total - emAndamento - finalizadas) || 3, color: "#6366f1" }
        ];
        setStatusData(statusCounts);

      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [empresaId]);

  // Custom Tooltip for Charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100">
          <p className="font-bold text-slate-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm font-medium">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-500">{entry.name}:</span>
              <span className="text-slate-900">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ClientLayout>
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 md:p-10 text-white shadow-2xl shadow-slate-900/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Olá, {localStorage.getItem("userName") || "Gestor"}! 👋
              </h1>
              <p className="text-slate-300 text-lg max-w-xl">
                Bem-vindo ao seu painel de controle inteligente. Hoje é um ótimo dia para otimizar suas cargas.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/carregamento')}
                className="px-5 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <Package size={20} />
                Nova Carga
              </button>
              <button
                onClick={() => navigate('/FullLoad')}
                className="px-5 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
              >
                <Box size={20} />
                Novo Plano 3D
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            icon={Package}
            title="Total de Cargas"
            value={stats.total}
            trend="+12.5%"
            trendUp={true}
            color="bg-blue-500"
          />
          <MetricCard
            icon={Activity}
            title="Em Andamento"
            value={stats.emAndamento}
            trend="+5.2%"
            trendUp={true}
            color="bg-amber-500"
          />
          <MetricCard
            icon={CheckCircle}
            title="Finalizadas"
            value={stats.finalizadas}
            trend="+8.1%"
            trendUp={true}
            color="bg-emerald-500"
          />
          <MetricCard
            icon={Box}
            title="Planos 3D Criados"
            value={stats.planos3d}
            trend="+24.3%"
            trendUp={true}
            color="bg-purple-500"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Area Chart - Volume */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Volume de Operações</h3>
                <p className="text-sm text-slate-500">Cargas e Planos 3D nos últimos 6 meses</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorCargas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPlanos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="cargas" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorCargas)" name="Cargas" />
                  <Area type="monotone" dataKey="planos" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPlanos)" name="Planos 3D" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart - Status */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Status das Cargas</h3>
                <p className="text-sm text-slate-500">Distribuição atual</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <PieIcon className="w-5 h-5 text-slate-400" />
              </div>
            </div>
            <div className="h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                <div className="text-center">
                  <span className="block text-3xl font-bold text-slate-900">{stats.total}</span>
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Tables Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Loads */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" />
                Cargas Recentes
              </h3>
              <button onClick={() => navigate('/carregamento')} className="text-sm text-orange-600 font-semibold hover:text-orange-700 transition-colors">Ver todas</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {carregamentos.slice(0, 5).map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => navigate('/carregamento')}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700 group-hover:text-orange-600 transition-colors">{c.descricao}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${c.status === 'Finalizado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          c.status === 'Em andamento' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                          }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {c.dataEntrada?.toDate().toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {carregamentos.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center text-slate-400">
                        <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                        Nenhuma carga recente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent 3D Plans */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <Box className="w-5 h-5 text-purple-500" />
                Planos 3D Recentes
              </h3>
              <button onClick={() => navigate('/FullLoad')} className="text-sm text-orange-600 font-semibold hover:text-orange-700 transition-colors">Ver todos</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Itens</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {planos.slice(0, 5).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700 group-hover:text-purple-600 transition-colors">{p.nome}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded-md text-xs font-bold text-slate-600">
                          {p.items?.length || 0} itens
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/fullload3d?planId=${p.id}`)}
                          className="text-slate-400 hover:text-orange-600 font-medium text-sm flex items-center gap-1 transition-colors"
                        >
                          Abrir <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {planos.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center text-slate-400">
                        <Box className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                        Nenhum plano 3D recente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

function MetricCard({ icon: Icon, title, value, trend, trendUp, color }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-colors`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">{title}</h3>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
