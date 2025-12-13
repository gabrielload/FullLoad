import React from "react";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function StatusIndicator({ status }) {
    if (status === "idle") return null;

    return (
        <div className="absolute top-24 right-6 z-40 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border backdrop-blur-md ${status === "saving" ? "bg-slate-900/80 text-white border-slate-700" :
                    status === "saved" ? "bg-emerald-500/90 text-white border-emerald-400" :
                        "bg-red-500/90 text-white border-red-400"
                }`}>
                {status === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
                {status === "saved" && <CheckCircle className="w-4 h-4" />}
                {status === "error" && <AlertCircle className="w-4 h-4" />}

                <span className="text-xs font-bold uppercase tracking-wider">
                    {status === "saving" ? "Salvando..." :
                        status === "saved" ? "Auto-Salvo" :
                            "Erro ao salvar"}
                </span>
            </div>
        </div>
    );
}
