import React from 'react';
import { Scale, CheckCircle, AlertTriangle } from 'lucide-react';

export default function WeightDistributionHUD({ cgX, cgZ, truckL, truckW, totalWeight, isBalanced }) {
    if (!truckL || !truckW) return null;

    // Convert real coordinates to Percentage for CSS positioning
    // Truck origin (0,0) is usually Front-Left or Back-Right depending on engine.
    // In fullLoadEngine:
    // X = Length (0 to L), Z = Width (0 to W).
    // Origin (0,0,0) is corner.
    // X moves towards Cab? No, X is usually Length axis.

    // Let's assume standard top-down view mapping:
    // Container Width = 100%, Height = 100% (CSS)
    // Left = (x / L) * 100%
    // Top  = (z / W) * 100%

    const pctX = (cgX / truckL) * 100;
    const pctZ = (cgZ / truckW) * 100;

    // Clamp percentages to avoid dot flying off
    const safeX = Math.max(0, Math.min(100, pctX));
    const safeZ = Math.max(0, Math.min(100, pctZ));

    return (
        <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 w-72 pointer-events-none select-none z-30">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Scale size={18} className="text-slate-500" />
                    <h3 className="text-sm font-bold text-slate-700">Distribuição de Peso</h3>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${isBalanced ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                    {isBalanced ? "Balanceado" : "Desbalanceado"}
                </div>
            </div>

            {/* Visual Chassis */}
            <div className="relative w-full h-32 bg-slate-100 rounded-lg border-2 border-slate-300 overflow-hidden mb-4">

                {/* Wheels (Decorative) */}
                <div className="absolute top-2 -left-1 w-2 h-8 bg-slate-800 rounded-r" />
                <div className="absolute bottom-2 -left-1 w-2 h-8 bg-slate-800 rounded-r" />
                <div className="absolute top-2 -right-1 w-2 h-8 bg-slate-800 rounded-l" />
                <div className="absolute bottom-2 -right-1 w-2 h-8 bg-slate-800 rounded-l" />

                {/* Green Zone (Target) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/2 bg-green-500/20 border border-green-500/30 rounded-full blur-sm" />

                {/* Center Crosshair */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-slate-300"></div>
                <div className="absolute top-0 left-1/2 w-[1px] h-full bg-slate-300"></div>

                {/* CG Dot */}
                {totalWeight > 0 && (
                    <div
                        className={`absolute w-4 h-4 rounded-full border-2 shadow-sm transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${isBalanced ? "bg-green-500 border-white" : "bg-red-500 border-white animate-pulse"}`}
                        style={{ left: `${safeX}%`, top: `${safeZ}%` }}
                    >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] py-0.5 px-1.5 rounded opacity-0 hover:opacity-100 whitespace-nowrap">
                            CG
                        </div>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <p className="text-slate-400 mb-0.5">Peso Total</p>
                    <p className="font-bold text-slate-800">{totalWeight.toFixed(0)} kg</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <p className="text-slate-400 mb-0.5">Centro (X)</p>
                    <p className="font-bold text-slate-800">{cgX.toFixed(2)} m</p>
                </div>
            </div>

            {!isBalanced && totalWeight > 0 && (
                <div className="mt-3 flex items-start gap-2 text-[10px] text-red-600 bg-red-50 p-2 rounded-lg">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <p>A carga está mal distribuída. Tente mover itens pesados para o centro.</p>
                </div>
            )}

        </div>
    );
}
