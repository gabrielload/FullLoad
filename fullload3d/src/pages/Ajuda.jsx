import React from "react";
import ClientLayout from "../layouts/ClientLayout";
import { HelpCircle, MessageCircle, FileText, Mail } from "lucide-react";

export default function Ajuda() {
    return (
        <ClientLayout>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Ajuda e Suporte</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div onClick={() => alert("Documentação em breve!")} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FileText size={24} />
                        </div>
                        <h3 className="font-bold text-slate-800 mb-2">Documentação</h3>
                        <p className="text-sm text-slate-500">Guias detalhados sobre como usar todas as funcionalidades.</p>
                    </div>

                    <div onClick={() => window.dispatchEvent(new CustomEvent('openChat'))} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group">
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <MessageCircle size={24} />
                        </div>
                        <h3 className="font-bold text-slate-800 mb-2">Chat ao Vivo</h3>
                        <p className="text-sm text-slate-500">Fale com nossa equipe de suporte em tempo real.</p>
                    </div>

                    <div onClick={() => window.location.href = "mailto:suporte@fullload.com"} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group">
                        <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Mail size={24} />
                        </div>
                        <h3 className="font-bold text-slate-800 mb-2">Email</h3>
                        <p className="text-sm text-slate-500">Envie suas dúvidas para suporte@fullload.com</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <HelpCircle size={20} className="text-orange-500" />
                            Perguntas Frequentes
                        </h2>
                    </div>
                    <div className="divide-y divide-slate-100">
                        <FAQItem
                            q="Como crio um novo plano de carga?"
                            a="Vá para o Dashboard e clique em 'Novo Plano 3D' ou acesse a aba 'FullLoad3D' no menu lateral."
                        />
                        <FAQItem
                            q="Posso exportar meu plano para PDF?"
                            a="Sim! Dentro do editor 3D, clique no ícone de download na barra de ferramentas para gerar um relatório PDF."
                        />
                        <FAQItem
                            q="Como adiciono novos caminhões?"
                            a="Acesse a aba 'Caminhões' no menu lateral e clique em 'Adicionar Veículo'."
                        />
                    </div>
                </div>
            </div>
        </ClientLayout>
    );
}

function FAQItem({ q, a }) {
    return (
        <div className="p-6 hover:bg-slate-50 transition-colors">
            <h4 className="font-bold text-slate-700 mb-2">{q}</h4>
            <p className="text-sm text-slate-500">{a}</p>
        </div>
    );
}
