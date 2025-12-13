import React from "react";
import { Box, Scale } from "lucide-react";

export default function StatsHUD({ stats }) {
    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="flex gap-4 bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl border border-white/10">
                <div className="flex items-center gap-2">
                    <Box size={16} className="text-orange-400" />
                    <span className="font-bold">{stats.count}</span>
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Itens</span>
                </div>
                <div className="w-px bg-white/20"></div>
                <div className="flex items-center gap-2">
                    <Scale size={16} className="text-blue-400" />
                    <span className="font-bold">{stats.weight.toFixed(1)}</span>
                    <span className="text-xs text-slate-400 uppercase tracking-wider">kg</span>
                </div>
            </div>
        </div>
    );
}
