import React from "react";
import { X } from "lucide-react";

export default function ShortcutsModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Atalhos do Teclado</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <ShortcutKey k="R" desc="Rotacionar item (90°)" />
                    <ShortcutKey k="Espaço" desc="Alternar visualização (Iso/Top/Side)" />
                    <ShortcutKey k="G" desc="Alternar grade (Grid)" />
                    <ShortcutKey k="ESC" desc="Cancelar modo de colocação" />
                    <ShortcutKey k="Delete" desc="Remover item selecionado" />
                    <ShortcutKey k="Setas" desc="Mover item selecionado (1cm)" />
                    <ShortcutKey k="V" desc="Empilhar Vertical (Duplicar no topo)" />
                    <ShortcutKey k="H" desc="Empilhar Horizontal (Duplicar ao lado)" />
                    <ShortcutKey k="PageUp/Down" desc="Ajustar altura do fantasma" />
                    <div className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100">
                        <p>💡 Clique em um item para selecionar. Clique no chão para posicionar.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ShortcutKey({ k, desc }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">{desc}</span>
            <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 min-w-[2rem] text-center shadow-sm">
                {k}
            </kbd>
        </div>
    );
}
