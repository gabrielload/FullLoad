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
  Box,
  FileDown
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


  const [monthlyData, setMonthlyData] = useState([]);
  const [statusData, setStatusData] = useState([]);

  const [filterType, setFilterType] = useState("all"); // all, month, year, day
  const [filterValue, setFilterValue] = useState(new Date().toISOString().split('T')[0]);

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
        let dadosCarreg = snapCarreg.docs.map((d) => ({ id: d.id, ...d.data() }));

        // 2. Planos 3D
        const qPlanos = query(
          collection(db, "empresas", empresaId, "planos_carga"),
          orderBy("dataCriacao", "desc")
        );
        const snapPlanos = await getDocs(qPlanos);
        let dadosPlanos = snapPlanos.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Apply Filters
        if (filterType !== 'all') {
          const filterDate = new Date(filterValue);

          const filterFn = (item) => {
            let date;
            if (item.dataEntrada && typeof item.dataEntrada.toDate === 'function') {
              date = item.dataEntrada.toDate();
            } else if (item.dataCriacao && typeof item.dataCriacao.toDate === 'function') {
              date = item.dataCriacao.toDate();
            } else {
              date = new Date(item.dataEntrada || item.dataCriacao || Date.now());
            }

            if (filterType === 'day') {
              return date.toDateString() === filterDate.toDateString();
            } else if (filterType === 'month') {
              return date.getMonth() === filterDate.getMonth() && date.getFullYear() === filterDate.getFullYear();
            } else if (filterType === 'year') {
              return date.getFullYear() === filterDate.getFullYear();
            }
            return true;
          };

          dadosCarreg = dadosCarreg.filter(filterFn);
          dadosPlanos = dadosPlanos.filter(filterFn);
        }

        setCarregamentos(dadosCarreg);
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
        // Agrupar por mês (últimos 6 meses)
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const today = new Date();
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          last6Months.push({
            monthIndex: d.getMonth(),
            year: d.getFullYear(),
            name: months[d.getMonth()]
          });
        }

        const realMonthlyData = last6Months.map(m => {
          const cargasCount = dadosCarreg.filter(c => {
            let d;
            if (c.dataEntrada && typeof c.dataEntrada.toDate === 'function') {
              d = c.dataEntrada.toDate();
            } else {
              d = new Date(c.dataEntrada || Date.now());
            }
            return d.getMonth() === m.monthIndex && d.getFullYear() === m.year;
          }).length;

          const planosCount = dadosPlanos.filter(p => {
            const d = new Date(p.dataCriacao && typeof p.dataCriacao.toDate === 'function' ? p.dataCriacao.toDate() : p.dataCriacao || Date.now());
            return d.getMonth() === m.monthIndex && d.getFullYear() === m.year;
          }).length;

          return {
            name: m.name,
            cargas: cargasCount,
            planos: planosCount
          };
        });

        setMonthlyData(realMonthlyData);

        // Dados de Status Reais
        const statusCounts = [
          { name: "Em Andamento", value: emAndamento || 0, color: "#f59e0b" },
          { name: "Finalizadas", value: finalizadas || 0, color: "#10b981" },
          { name: "Pendentes", value: Math.max(0, total - emAndamento - finalizadas) || 0, color: "#6366f1" }
        ].filter(item => item.value > 0); // Only show statuses with data
        setStatusData(statusCounts);

      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, [empresaId, filterType, filterValue]);

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

  const exportReport = () => {
    const csvContent = [
      ["Tipo", "Descrição/Nome", "Status/Documento", "Data", "Qtd Itens"],
      ...carregamentos.map(c => ["Carga Manual", c.descricao, c.status, c.dataEntrada?.toDate().toLocaleDateString(), c.quantidade]),
      ...planos.map(p => ["Plano 3D", p.nome, p.documento, new Date(p.dataCriacao).toLocaleDateString(), p.items?.length || 0])
    ].map(e => e.join(";")).join("\r\n"); // Changed to semicolon and CRLF

    // Add UTF-8 BOM for Excel compatibility
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_fullload_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ClientLayout>
      <div className="min-h-screen bg-slate-50/50 p-2 md:p-4 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Dashboards
            </h1>
            <p className="text-slate-500 mt-1">Bem-vindo ao seu painel de controle logístico.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportReport}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-emerald-500/20"
            >
              <FileDown size={18} />
              Exportar Relatório
            </button>

            <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl shadow-sm border border-slate-100">
              <span className="text-sm font-bold text-slate-600 px-2">Alterar datas:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-medium text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <option value="all">Todo o Período</option>
                <option value="day">Hoje</option>
                <option value="month">Este Mês</option>
                <option value="year">Este Ano</option>
              </select>

              {filterType !== 'all' && (
                <input
                  type={filterType === 'day' ? 'date' : filterType === 'month' ? 'month' : 'number'}
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="bg-slate-50 border-none outline-none text-sm font-medium text-slate-600 px-3 py-2 rounded-lg"
                />
              )}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            icon={Package}
            title="Total de Cargas"
            value={stats.total}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            iconBg="bg-indigo-500"
          />
          <MetricCard
            icon={Clock}
            title="Em Andamento"
            value={stats.emAndamento}
            gradient="linear-gradient(135deg, #f6d365 0%, #fda085 100%)"
            iconBg="bg-orange-500"
          />
          <MetricCard
            icon={CheckCircle}
            title="Finalizadas"
            value={stats.finalizadas}
            gradient="linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)"
            iconBg="bg-emerald-500"
          />
          <MetricCard
            icon={Box}
            title="Planos 3D"
            value={stats.planos3d}
            gradient="linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)"
            iconBg="bg-purple-500"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="text-orange-500" size={20} />
                Volume de Cargas
              </h2>
              <button className="text-slate-400 hover:text-orange-500 transition-colors">
                <FileDown size={18} />
              </button>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f1f5f9' }}
                  />
                  <Bar dataKey="cargas" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <PieIcon className="text-purple-500" size={20} />
              Status Atual
            </h2>
            <div className="h-[300px] w-full relative">
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
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-3xl font-bold text-slate-800">{stats.total}</span>
                <span className="text-xs text-slate-400 font-medium uppercase">Total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity & Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">


          {/* Recent 3D Plans */}
          <div className="bg-white rounded-3xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Box className="text-purple-600" size={20} />
                Planos 3D Recentes
              </h2>
              <button onClick={() => navigate("/Carregamento")} className="text-sm text-indigo-600 font-bold hover:text-indigo-700 transition-colors">Ver todos</button>
            </div>
            <div className="divide-y divide-slate-100">
              {planos.filter(p => p.nome).length > 0 ? (
                planos.filter(p => p.nome).slice(0, 5).map((p) => (
                  <div key={p.id} className="p-5 hover:bg-indigo-50/30 transition-all flex items-center justify-between group cursor-pointer border-l-4 border-transparent hover:border-indigo-500" onClick={() => navigate(`/FullLoad?planId=${p.id}`)}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Box size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm md:text-base group-hover:text-indigo-700 transition-colors">{p.nome || "-"}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{p.items?.length || 0} itens</span>
                          <span>•</span>
                          <span>{new Date(p.dataCriacao?.toDate ? p.dataCriacao.toDate() : p.dataCriacao).toLocaleDateString()}</span>
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:border-indigo-100 transition-all">
                      <ArrowRight size={14} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Box size={32} className="text-slate-300" />
                  </div>
                  <p className="font-medium text-slate-600">Nenhum plano recente</p>
                  <p className="text-sm mb-4">Comece criando um novo carregamento.</p>
                  <button onClick={() => navigate("/FullLoad")} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10">Criar Agora</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

function MetricCard({ icon: Icon, title, value, trend, trendUp, gradient, iconBg }) {
  return (
    <div className="relative overflow-hidden bg-white rounded-3xl p-6 shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(6,81,237,0.15)] transition-all duration-300 group border border-slate-100">
      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
          <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>

          {trend && (
            <div className={`flex items-center gap-1 text-xs font-bold mt-2 ${trendUp ? "text-emerald-500" : "text-rose-500"}`}>
              {trendUp ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />}
              {trend}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/10 ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>

      {/* Decorative Blur */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500" />
    </div>
  );
}
