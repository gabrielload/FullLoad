import React from "react";
import { X, AlertTriangle, CheckCircle, Info } from "lucide-react";

export default function Modal({ isOpen, onClose, title, children, type = "info", onConfirm, confirmText = "Confirmar", cancelText = "Cancelar", showCancel = true }) {
    if (!isOpen) return null;

    const types = {
        info: { icon: Info, color: "text-blue-500", bg: "bg-blue-50" },
        success: { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
        warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" },
        danger: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
    };

    const style = types[type] || types.info;
    const Icon = style.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl transform transition-all animate-in fade-in zoom-in duration-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center ${style.color}`}>
                            <Icon size={18} />
                        </div>
                        <h3 className="font-bold text-slate-900">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 text-slate-600">
                    {children}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    {showCancel && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-white hover:border-slate-300 transition-all text-sm"
                        >
                            {cancelText}
                        </button>
                    )}
                    {onConfirm && (
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className={`px-4 py-2 rounded-xl text-white font-bold shadow-lg transition-all text-sm flex items-center gap-2
                ${type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20'}
              `}
                        >
                            {confirmText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
