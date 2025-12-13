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
    onShortcuts
}) {
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
