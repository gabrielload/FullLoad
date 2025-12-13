import React, { useState } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { Bell, Lock, Globe, FileDown } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../services/firebaseConfig";
import * as XLSX from "xlsx";

export default function Configuracoes() {
    const [notifications, setNotifications] = useState(true);

    const handlePasswordReset = async () => {
        const user = auth.currentUser;
        if (!user || !user.email) {
            alert("Você precisa estar logado para alterar a senha.");
            return;
        }

        if (window.confirm(`Enviar email de redefinição de senha para ${user.email}?`)) {
            try {
                await sendPasswordResetEmail(auth, user.email);
                alert("Email enviado com sucesso! Verifique sua caixa de entrada.");
            } catch (error) {
                console.error("Erro ao enviar email:", error);
                alert("Erro ao enviar email. Tente novamente mais tarde.");
            }
        }
    };

    const handleDownloadTemplate = (type) => {
        let data = [];
        let filename = "";

        if (type === "mercadorias") {
            data = [
                {
                    nome: "Caixa Exemplo",
                    codigo: "CX001",
                    quantidade: 10,
                    tipo: "caixa",
                    peso: 5.5,
                    comprimento: 30,
                    largura: 20,
                    altura: 15,
                    precoUnitario: 10.00,
                    status: "ativo",
                    posicao: "livre",
                    cor: "#ff7a18"
                }
            ];
            filename = "modelo_mercadorias.xlsx";
        } else if (type === "caminhoes") {
            data = [
                {
                    nome: "Veículo Exemplo",
                    modelo: "Scania R450",
                    placa: "ABC-1234",
                    comprimento: 1360,
                    largura: 245,
                    altura: 280,
                    tara: 7000
                }
            ];
            filename = "modelo_caminhoes.xlsx";
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Modelo");
        XLSX.writeFile(wb, filename);
    };

    return (
        <ClientLayout>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Configurações</h1>

                <div className="space-y-6">
                    {/* Notifications */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Bell size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Notificações</h2>
                                <p className="text-sm text-slate-500">Gerencie como você recebe alertas.</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-4 border-b border-slate-50">
                            <div>
                                <p className="font-medium text-slate-700">Receber notificações por email</p>
                                <p className="text-xs text-slate-400">Atualizações importantes sobre suas cargas.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={notifications} onChange={() => setNotifications(!notifications)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <Lock size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Segurança</h2>
                                <p className="text-sm text-slate-500">Proteja sua conta e dados.</p>
                            </div>
                        </div>

                        <button onClick={handlePasswordReset} className="text-orange-600 font-medium hover:underline text-sm">Alterar senha</button>
                    </div>

                    {/* Import Templates */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                <FileDown size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Modelos de Importação</h2>
                                <p className="text-sm text-slate-500">Baixe os modelos CSV para importar dados.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => handleDownloadTemplate("mercadorias")}
                                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors group"
                            >
                                <div className="text-left">
                                    <p className="font-bold text-slate-700">Modelo Mercadorias</p>
                                    <p className="text-xs text-slate-400">CSV para importar produtos</p>
                                </div>
                                <FileDown className="text-slate-400 group-hover:text-orange-500 transition-colors" size={20} />
                            </button>

                            <button
                                onClick={() => handleDownloadTemplate("caminhoes")}
                                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors group"
                            >
                                <div className="text-left">
                                    <p className="font-bold text-slate-700">Modelo Veículos</p>
                                    <p className="text-xs text-slate-400">CSV para importar veículos</p>
                                </div>
                                <FileDown className="text-slate-400 group-hover:text-orange-500 transition-colors" size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ClientLayout>
    );
}
