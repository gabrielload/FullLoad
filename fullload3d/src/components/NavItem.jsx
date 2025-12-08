import React from "react";
import { Link } from "react-router-dom";

export default function NavItem({ to, icon: Icon, label, isOpen, active, highlight }) {
    return (
        <Link
            to={to}
            className={`
        flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative
        ${active
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                    : highlight
                        ? "bg-slate-800 text-white hover:bg-slate-700"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                }
        ${!isOpen && "justify-center px-0"}
      `}
            title={!isOpen ? label : ""}
        >
            <Icon
                size={20}
                className={`
          transition-colors duration-300
          ${active ? "text-white" : highlight ? "text-orange-500" : "text-slate-400 group-hover:text-white"}
        `}
            />

            {isOpen && (
                <span className="font-medium text-sm truncate">{label}</span>
            )}

            {/* Active Indicator for collapsed state */}
            {active && !isOpen && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full" />
            )}
        </Link>
    );
}
