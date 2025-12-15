import React from "react";
import { Undo2, Redo2, Box, RefreshCw, Camera, Save, List, FileDown, Info } from "lucide-react";
import ActionButton from "./ActionButton";

export default function Toolbar({
    undo,
    redo,
    historyState,
    onOptimize,
    onNewPlan,
    onScreenshot,
    onSave,
    onList,
    onPDF,
    onShortcuts,
    items = []
}) {
    // Calculate stats with useMemo to prevent lag on 1000+ items
    const { totalCount, totalWeight, grouped } = React.useMemo(() => {
        const totalCount = items.length;
        const totalWeight = items.reduce((acc, item) => acc + Number(item.meta?.peso || 0), 0);

        // Group items
        const grouped = {};
        items.forEach(item => {
            const tipo = item.tipo || item.meta?.tipo || 'caixa';
            const key = item.meta?.nome || tipo;
            if (!grouped[key]) {
                grouped[key] = { count: 0, tipo };
            }
            grouped[key].count++;
        });

        return { totalCount, totalWeight, grouped };
    }, [items]);

    return (
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-slate-700 ring-1 ring-black/50 animate-in slide-in-from-bottom-10 duration-500 max-w-[95vw] overflow-x-auto scrollbar-hide">
            {/* Undo/Redo Group */}
            <div className="flex gap-1 mr-2 flex-shrink-0">
                <button
                    onClick={undo}
                    disabled={!historyState.canUndo}
                    className={`p-3 rounded-xl transition-all ${historyState.canUndo ? 'text-slate-200 hover:bg-slate-800 hover:text-white hover:scale-110' : 'text-slate-600 cursor-not-allowed'}`}
                    title="Desfazer (Ctrl+Z)"
                >
                    <Undo2 className="w-5 h-5" />
                </button>
                <button
                    onClick={redo}
                    disabled={!historyState.canRedo}
                    className={`p-3 rounded-xl transition-all ${historyState.canRedo ? 'text-slate-200 hover:bg-slate-800 hover:text-white hover:scale-110' : 'text-slate-600 cursor-not-allowed'}`}
                    title="Refazer (Ctrl+Y)"
                >
                    <Redo2 className="w-5 h-5" />
                </button>
            </div>

            <div className="w-px h-8 bg-slate-700 mx-1 flex-shrink-0"></div>

            <div className="flex gap-2 flex-shrink-0">
                <ActionButton
                    icon={<Box className="w-5 h-5" />}
                    label="Otimizar"
                    onClick={onOptimize}
                    color="text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                    minimal
                />
            </div>

            {/* NEW: Stats Summary Group */}
            <div className="w-px h-8 bg-slate-700 mx-1 flex-shrink-0"></div>

            <div className="group relative flex flex-col items-center justify-center px-4 py-1.5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-all cursor-help min-w-[100px] flex-shrink-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                    {totalCount} <span className="text-[10px] font-normal text-slate-400">ITENS</span>
                </span>

                {/* Hover Popover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-3 rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-200 z-50">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-700 pb-2">Resumo da Carga</h4>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                        {Object.entries(grouped).length === 0 ? (
                            <p className="text-xs text-slate-500 py-2 text-center">Nenhum item adicionado</p>
                        ) : (
                            Object.entries(grouped).map(([name, data]) => (
                                <div key={name} className="flex justify-between items-center text-xs">
                                    <span className="text-slate-300 truncate max-w-[140px] uppercase" title={name}>{name}</span>
                                    <span className="font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">{data.count}</span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-700 flex justify-between items-center text-xs">
                        <span className="text-slate-400">Peso Total:</span>
                        <span className="font-bold text-white">{totalWeight.toFixed(1)} kg</span>
                    </div>
                </div>
            </div>

            <div className="w-px h-8 bg-slate-700 mx-1 flex-shrink-0"></div>

            <div className="flex gap-1 flex-shrink-0">
                <ActionButton
                    icon={<RefreshCw className="w-5 h-5" />}
                    label="Novo"
                    onClick={onNewPlan}
                    color="text-slate-200 hover:bg-slate-800 hover:text-white"
                    minimal
                />
                <ActionButton
                    icon={<Camera className="w-5 h-5" />}
                    label="Print"
                    onClick={onScreenshot}
                    color="text-slate-200 hover:bg-slate-800 hover:text-white"
                    minimal
                />
                <ActionButton
                    icon={<Save className="w-5 h-5" />}
                    label="Salvar"
                    onClick={onSave}
                    color="text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                    minimal
                />
                <ActionButton
                    icon={<List className="w-5 h-5" />}
                    label="Lista"
                    onClick={onList}
                    color="text-slate-200 hover:bg-slate-800 hover:text-white"
                    minimal
                />
                <ActionButton
                    icon={<FileDown className="w-5 h-5" />}
                    label="PDF"
                    onClick={onPDF}
                    color="text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                    minimal
                />
            </div>

            <div className="w-px h-8 bg-slate-700 mx-1 flex-shrink-0"></div>

            <div className="flex-shrink-0">
                <ActionButton
                    icon={<Info className="w-5 h-5" />}
                    label="Atalhos"
                    onClick={onShortcuts}
                    color="text-slate-200 hover:bg-slate-800 hover:text-white"
                    minimal
                />
            </div>
        </div>
    );
}
