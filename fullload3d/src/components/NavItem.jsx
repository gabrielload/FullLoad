import React from "react";
import { Link } from "react-router-dom";

export default function NavItem({ to, icon: Icon, label, isOpen, active, highlight, variant }) {

    // Base classes
    const baseClasses = "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden";

    // Variant Logic
    let activeClass = "";
    let inactiveClass = "";
    let iconActiveClass = "";
    let iconInactiveClass = "";

    if (variant === "dark") {
        // Light Theme Sidebar (if used anywhere)
        activeClass = "bg-slate-900 text-white shadow-lg";
        inactiveClass = "text-slate-500 hover:text-slate-900 hover:bg-slate-100";
        iconActiveClass = "text-white";
        iconInactiveClass = "text-slate-400 group-hover:text-slate-600";
    } else {
        // Default Dark Sidebar (Current)
        activeClass = "bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/25 ring-1 ring-orange-400/20";
        inactiveClass = highlight
            ? "bg-white/5 text-white hover:bg-white/10 ring-1 ring-white/10"
            : "text-slate-400 hover:bg-white/[0.03] hover:text-white";
        iconActiveClass = "text-white";
        iconInactiveClass = highlight ? "text-orange-500" : "text-slate-400 group-hover:text-white transition-colors duration-300";
    }

    return (
        <Link
            to={to}
            className={`
        ${baseClasses}
        ${active ? activeClass : inactiveClass}
        ${!isOpen && "justify-center px-0"}
      `}
            title={!isOpen ? label : ""}
        >
            <Icon
                size={20}
                className={`
          transition-colors duration-300
          ${active ? iconActiveClass : iconInactiveClass}
        `}
            />

            {isOpen && (
                <span className="font-medium text-sm truncate">{label}</span>
            )}

            {/* Active Indicator for collapsed state (optional, removed for dark theme consistency) */}
            {active && !isOpen && variant !== "dark" && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full" />
            )}
        </Link>
    );
}
