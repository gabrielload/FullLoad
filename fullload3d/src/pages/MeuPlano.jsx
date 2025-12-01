// src/pages/MeuPlano.jsx
import React, { useEffect, useState } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { db } from "../services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import {
    Building2,
    CreditCard,
    Calendar,
    CheckCircle,
    ShieldCheck,
    Clock,
    Download,
    AlertCircle
} from "lucide-react";

export default function MeuPlano() {
    const [empresa, setEmpresa] = useState(null);
    const [loading, setLoading] = useState(true);
    const empresaId = localStorage.getItem("empresaId");

    useEffect(() => {
        const carregarDados = async () => {
            if (!empresaId) return;
            try {
                const docRef = doc(db, "empresas", empresaId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setEmpresa(docSnap.data());
                }
            } catch (error) {
                console.error("Erro ao carregar empresa:", error);
            } finally {
                setLoading(false);
            }
        };
        carregarDados();
    }, [empresaId]);

    if (loading) {
        return (
            <ClientLayout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
                </div>
            </ClientLayout>
        );
    }

    return (
        <ClientLayout>
            <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Meu Plano & Assinatura</h1>
                    <p className="text-slate-500 mt-1">Gerencie os detalhes da sua conta e informações de pagamento.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Coluna Esquerda: Detalhes da Empresa */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Card da Empresa */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-3">
                                <Building2 className="text-slate-400" size={20} />
                                <h2 className="font-bold text-slate-800">Informações da Empresa</h2>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Razão Social</label>
                                    <div className="text-slate-900 font-medium text-lg">{empresa?.nome || "Não informado"}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CNPJ</label>
                                    <div className="text-slate-900 font-medium text-lg">{empresa?.cnpj || "Não informado"}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email de Contato</label>
                                    <div className="text-slate-900 font-medium">{empresa?.email || "Não informado"}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Telefone</label>
                                    <div className="text-slate-900 font-medium">{empresa?.telefone || "Não informado"}</div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Endereço</label>
                                    <div className="text-slate-900 font-medium">{empresa?.endereco || "Não informado"}</div>
                                </div>
                            </div>
                        </div>

                        {/* Seção de Pagamento (Placeholder) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-3">
                                <CreditCard className="text-slate-400" size={20} />
                                <h2 className="font-bold text-slate-800">Método de Pagamento</h2>
                            </div>
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CreditCard className="text-slate-400" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Gerenciar Pagamentos</h3>
                                <p className="text-slate-500 max-w-md mx-auto mb-6">
                                    Em breve você poderá gerenciar seus cartões de crédito, visualizar faturas e alterar sua forma de pagamento diretamente por aqui.
                                </p>
                                <button className="px-6 py-2 bg-slate-100 text-slate-400 font-bold rounded-xl cursor-not-allowed border border-slate-200">
                                    Funcionalidade em Breve
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita: Card do Plano */}
                    <div className="space-y-8">
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl text-white p-6 relative overflow-hidden">
                            {/* Background Decoration */}
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-orange-500 rounded-full opacity-20 blur-3xl"></div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="px-3 py-1 bg-orange-500/20 text-orange-300 text-xs font-bold rounded-full border border-orange-500/30">
                                        PLANO ATUAL
                                    </span>
                                    <ShieldCheck className="text-orange-400" size={24} />
                                </div>

                                <h2 className="text-3xl font-bold mb-1">Enterprise</h2>
                                <p className="text-slate-400 text-sm mb-6">Acesso total a todas as funcionalidades.</p>

                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <CheckCircle size={16} className="text-emerald-400" />
                                        <span>Usuários Ilimitados</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <CheckCircle size={16} className="text-emerald-400" />
                                        <span>Cargas Ilimitadas</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <CheckCircle size={16} className="text-emerald-400" />
                                        <span>Suporte Prioritário 24/7</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <CheckCircle size={16} className="text-emerald-400" />
                                        <span>Dashboard Avançado</span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/10">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">Status</span>
                                        <span className="flex items-center gap-2 text-emerald-400 font-bold">
                                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                            Ativo
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm mt-2">
                                        <span className="text-slate-400">Renova em</span>
                                        <span className="text-white font-medium">22 Dez, 2025</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Histórico Recente (Mock) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-3">
                                <Clock className="text-slate-400" size={20} />
                                <h2 className="font-bold text-slate-800">Histórico de Faturas</h2>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">Fatura #{2025000 + i}</p>
                                            <p className="text-xs text-slate-500">22 Nov, 2025</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-medium text-slate-700">R$ 299,90</span>
                                            <button className="p-2 text-slate-400 hover:text-orange-500 transition-colors">
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 text-center border-t border-slate-50">
                                <button className="text-xs font-bold text-orange-600 hover:text-orange-700">Ver todo o histórico</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ClientLayout>
    );
}
