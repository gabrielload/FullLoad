import React from "react";
import { FileDown, List, Layers, FileText } from "lucide-react";

export default function ExportModal({ onClose, onConfirm, saveForm, setSaveForm }) {
    const [reportType, setReportType] = React.useState("simple"); // simple | step

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-100 mb-2">Exportar Relatório</h3>
                    <p className="text-sm text-slate-400 mb-6">Escolha o formato do documento que deseja gerar.</p>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button
                            onClick={() => setReportType("simple")}
                            className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-3 text-center group ${reportType === "simple"
                                ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                                : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600"
                                }`}
                        >
                            <div className={`p-2 rounded-full transition-colors ${reportType === "simple" ? "bg-amber-500/20 text-amber-500" : "bg-slate-800 text-slate-500 group-hover:text-slate-300"}`}>
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="block text-sm font-bold">Resumo Executivo</span>
                                <span className="block text-[10px] opacity-70 mt-1">Visão geral, totais e vistas básicas.</span>
                            </div>
                        </button>

                        <button
                            onClick={() => setReportType("step")}
                            className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-3 text-center group ${reportType === "step"
                                ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                                : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600"
                                }`}
                        >
                            <div className={`p-2 rounded-full transition-colors ${reportType === "step" ? "bg-amber-500/20 text-amber-500" : "bg-slate-800 text-slate-500 group-hover:text-slate-300"}`}>
                                <Layers className="w-6 h-6" />
                            </div>
                            <div>
                                <span className="block text-sm font-bold">Passo a Passo</span>
                                <span className="block text-[10px] opacity-70 mt-1">Manual detalhado por camadas.</span>
                            </div>
                        </button>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-800">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Identificação da Carga</label>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
                                    value={saveForm.documento}
                                    onChange={e => setSaveForm({ ...saveForm, documento: e.target.value })}
                                    placeholder="Nº Documento / Pedido"
                                />
                                <input
                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
                                    value={saveForm.tipoCarga}
                                    onChange={e => setSaveForm({ ...saveForm, tipoCarga: e.target.value })}
                                    placeholder="Tipo de Material"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-950/30 border-t border-slate-800 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl font-medium transition-colors text-sm">Cancelar</button>
                    <button
                        onClick={() => onConfirm(reportType === "step")}
                        className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-900/20 transition-all flex items-center gap-2 text-sm"
                    >
                        <FileDown className="w-4 h-4" />
                        {reportType === "step" ? "Gerar Manual" : "Gerar PDF"}
                    </button>
                </div>
            </div>
        </div>
    );
}
