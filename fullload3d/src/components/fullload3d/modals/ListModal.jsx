import React from "react";
import { X, Box } from "lucide-react";

export default function ListModal({ onClose, items }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Itens no Veículo ({items.length})</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                    {items.length === 0 ? (
                        <div className="text-center py-10">
                            <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">Nenhum item carregado.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Group items by type */}
                            {(() => {
                                const grouped = {};
                                items.forEach(item => {
                                    const tipo = item.tipo || item.meta?.tipo || 'caixa';
                                    if (!grouped[tipo]) {
                                        grouped[tipo] = { count: 0, weight: 0 };
                                    }
                                    grouped[tipo].count++;
                                    grouped[tipo].weight += Number(item.meta?.peso || 0);
                                });

                                const typeLabels = {
                                    'caixa': 'CAIXA',
                                    'cilindrico': 'CILINDRO',
                                    'pneu': 'PNEU'
                                };

                                return Object.entries(grouped).map(([tipo, data]) => (
                                    <div
                                        key={tipo}
                                        className="bg-gradient-to-r from-slate-50 to-white p-4 rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {/* Icon based on type */}
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tipo === 'caixa' ? 'bg-orange-100 text-orange-600' :
                                                    tipo === 'cilindrico' ? 'bg-blue-100 text-blue-600' :
                                                        'bg-purple-100 text-purple-600'
                                                    }`}>
                                                    <Box className="w-5 h-5" />
                                                </div>

                                                {/* Type and count */}
                                                <div>
                                                    <h4 className="font-bold text-slate-900 text-base">
                                                        {typeLabels[tipo] || tipo.toUpperCase()} - {data.count} {data.count === 1 ? 'ITEM' : 'ITENS'}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Peso total: <span className="font-semibold text-slate-700">{data.weight.toFixed(1)} kg</span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Count badge */}
                                            <div className={`px-3 py-1.5 rounded-full font-bold text-sm ${tipo === 'caixa' ? 'bg-orange-500 text-white' :
                                                tipo === 'cilindrico' ? 'bg-blue-500 text-white' :
                                                    'bg-purple-500 text-white'
                                                }`}>
                                                {data.count}
                                            </div>
                                        </div>
                                    </div>
                                ));
                            })()}

                            {/* Total summary */}
                            <div className="mt-4 pt-4 border-t-2 border-slate-200">
                                <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-xl">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Total Geral</p>
                                        <p className="font-bold text-xl">{items.length} {items.length === 1 ? 'ITEM' : 'ITENS'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Peso Total</p>
                                        <p className="font-bold text-xl">
                                            {items.reduce((acc, item) => acc + Number(item.meta?.peso || 0), 0).toFixed(1)} kg
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
