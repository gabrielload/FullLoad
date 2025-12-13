import React from "react";

export default function ActionButton({ icon, label, onClick, color, minimal }) {
    if (minimal) {
        return (
            <button
                onClick={onClick}
                className={`group relative flex items-center justify-center p-3 rounded-xl transition-all duration-200 hover:scale-110 ${color}`}
            >
                {icon}
                {/* Tooltip */}
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 shadow-xl">
                    {label}
                </span>
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            className={`group flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg shadow-slate-900/5 transition-all duration-200 hover:scale-105 hover:shadow-xl ${color}`}
            title={label}
        >
            {icon}
            <span className="font-medium text-sm hidden group-hover:block animate-in slide-in-from-right-2 duration-200 whitespace-nowrap">
                {label}
            </span>
        </button>
    );
}
