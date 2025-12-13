import React from "react";
import { ChevronDown, ChevronUp, Mouse, Keyboard } from "lucide-react";

export default function ControlsHUD({ showControlsHUD, setShowControlsHUD }) {
    return (
        <div className="absolute bottom-24 left-4 sm:bottom-6 sm:left-6 z-20">
            <div className={`bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700 transition-all duration-300 ring-1 ring-black/50 ${showControlsHUD ? 'w-72 sm:w-80' : 'w-auto'}`}>
                {/* HUD Header */}
                <div className="flex items-center justify-between p-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-slate-200">Controles</span>
                    </div>
                    <button
                        onClick={() => setShowControlsHUD(!showControlsHUD)}
                        className="p-1 hover:bg-slate-800 rounded-lg transition-colors pointer-events-auto"
                        title={showControlsHUD ? "Minimizar" : "Expandir"}
                    >
                        {showControlsHUD ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                    </button>
                </div>

                {/* HUD Content */}
                {showControlsHUD && (
                    <div className="p-4 space-y-4 text-xs">
                        {/* Mouse Controls */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Mouse className="w-4 h-4 text-orange-500" />
                                <h4 className="font-bold text-slate-200">Mouse</h4>
                            </div>
                            <div className="space-y-1.5 pl-6">
                                <ControlItem label="Clique Esquerdo" desc="Posicionar item" />
                                <ControlItem label="Clique Direito" desc="Rotacionar câmera" />
                                <ControlItem label="Scroll" desc="Zoom in/out" />
                                <ControlItem label="Shift + Clique" desc="Preencher coluna" />
                                <ControlItem label="Alt + Clique" desc="Empilhar lateral" />
                            </div>
                        </div>

                        {/* Keyboard Controls */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Keyboard className="w-4 h-4 text-orange-500" />
                                <h4 className="font-bold text-slate-200">Teclado</h4>
                            </div>
                            <div className="space-y-1.5 pl-6">
                                <ControlItem label="R" desc="Rotacionar item" />
                                <ControlItem label="Delete" desc="Remover item" />
                                <ControlItem label="G" desc="Alternar grade" />
                                <ControlItem label="V" desc="Mudar visualização" />
                                <ControlItem label="Setas" desc="Mover item" />
                                <ControlItem label="Esc" desc="Cancelar colocação" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ControlItem({ label, desc }) {
    return (
        <div className="flex items-start justify-between gap-2">
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-bold text-slate-300 whitespace-nowrap flex-shrink-0">
                {label}
            </kbd>
            <span className="text-slate-400 text-[11px] leading-tight">{desc}</span>
        </div>
    );
}
