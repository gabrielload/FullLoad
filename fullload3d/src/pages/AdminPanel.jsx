// src/pages/AdminPanel.jsx
import React, { useEffect, useState } from "react";
import { db } from "../services/firebaseConfig";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import AdminLayout from "../layouts/AdminLayout";
import StatCard from "../components/admin/StatCard";
import { Users, Building, AlertOctagon, TrendingUp, DollarSign, Activity } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminPanel() {
  const [stats, setStats] = useState({
    users: 0,
    companies: 0,
    activeCompanies: 0,
    revenue: 0,
  });
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const userSnap = await getDocs(collection(db, "usuarios"));
        const empresaSnap = await getDocs(collection(db, "empresas"));

        const usersCount = userSnap.size;
        const companies = empresaSnap.docs.map(d => d.data());
        const companiesCount = empresaSnap.size;

        const activeCompanies = companies.filter(e => e.ativo).length;

        // Mock Revenue Calculation (Basic=99, Premium=199, Enterprise=499)
        const revenue = companies.reduce((acc, curr) => {
          if (!curr.ativo) return acc;
          const val = curr.plano === 'enterprise' ? 499 : curr.plano === 'premium' ? 199 : 99;
          return acc + val;
        }, 0);

        setStats({
          users: usersCount,
          companies: companiesCount,
          activeCompanies,
          revenue
        });

        // Get recent companies (mock sorting by creation date if available, or just take first 5)
        // ideally we would use a proper query
        setRecentCompanies(companies.slice(0, 5));

      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-slate-50/50 p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Visão Geral</h1>
          <p className="text-slate-500">Bem-vindo ao painel administrativo.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Receita Mensal (Est.)"
            value={`R$ ${stats.revenue.toLocaleString('pt-BR')}`}
            icon={DollarSign}
            color="emerald"
            trend="up"
            trendValue="12%"
          />
          <StatCard
            title="Usuários Totais"
            value={stats.users}
            icon={Users}
            color="blue"
            trend="up"
            trendValue="5%"
          />
          <StatCard
            title="Empresas Ativas"
            value={stats.activeCompanies}
            icon={Building}
            color="orange"
            trend="neutral"
            trendValue="0%"
          />
          <StatCard
            title="Taxa de Atividade"
            value={`${stats.companies ? Math.round((stats.activeCompanies / stats.companies) * 100) : 0}%`}
            icon={Activity}
            color="purple"
            trend="down"
            trendValue="2%"
          />
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Companies */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Empresas Recentes</h2>
              <Link to="/empresas" className="text-orange-600 font-semibold text-sm hover:underline">Ver todas</Link>
            </div>

            <div className="space-y-4">
              {recentCompanies.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500">
                      {(c.nome || "?")[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{c.nome}</p>
                      <p className="text-xs text-slate-500">{c.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${c.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              ))}
              {recentCompanies.length === 0 && <p className="text-slate-500 text-center">Nenhuma empresa encontrada.</p>}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Ações Rápidas</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/empresas" className="p-4 bg-orange-50 rounded-xl border border-orange-100 hover:bg-orange-100 transition-colors flex flex-col items-center justify-center gap-2 text-center group">
                <Building className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-orange-900">Nova Empresa</span>
              </Link>
              <Link to="/usuarios" className="p-4 bg-blue-50 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors flex flex-col items-center justify-center gap-2 text-center group">
                <Users className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-blue-900">Gerenciar Usuários</span>
              </Link>
              <Link to="/admin/settings" className="p-4 bg-purple-50 rounded-xl border border-purple-100 hover:bg-purple-100 transition-colors flex flex-col items-center justify-center gap-2 text-center group">
                <AlertOctagon className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-purple-900">Configurações</span>
              </Link>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors flex flex-col items-center justify-center gap-2 text-center group cursor-pointer">
                <TrendingUp className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-emerald-900">Relatórios</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
