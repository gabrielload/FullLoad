import React from "react";
import { Loader2 } from "lucide-react";

export default function SaveModal({ onClose, onConfirm, saveForm, setSaveForm, saving }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Salvar Plano de Carga</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Documento <span className="text-red-500">*</span></label>
                        <input
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                            value={saveForm.documento}
                            onChange={e => setSaveForm({ ...saveForm, documento: e.target.value })}
                            placeholder="Ex: NF-1234"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Carga <span className="text-red-500">*</span></label>
                        <input
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                            value={saveForm.tipoCarga}
                            onChange={e => setSaveForm({ ...saveForm, tipoCarga: e.target.value })}
                            placeholder="Ex: Eletrônicos"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Processo (Opcional)</label>
                        <input
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                            value={saveForm.processo}
                            onChange={e => setSaveForm({ ...saveForm, processo: e.target.value })}
                            placeholder="Ex: PROC-001"
                        />
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancelar</button>
                        <button
                            onClick={onConfirm}
                            disabled={saving}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {saving ? "Salvando..." : "Salvar e Baixar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
