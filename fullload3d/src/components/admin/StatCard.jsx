import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export default function StatCard({ title, value, icon: Icon, trend, trendValue, color = "blue" }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        orange: "bg-orange-50 text-orange-600 border-orange-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        red: "bg-red-50 text-red-600 border-red-100",
    };

    const trendColors = {
        up: "text-emerald-600 bg-emerald-100",
        down: "text-red-600 bg-red-100",
        neutral: "text-slate-500 bg-slate-100",
    };

    const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
    const trendColor = trendColors[trend] || trendColors.neutral;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-2">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl ${colors[color]}`}>
                    <Icon size={24} />
                </div>
            </div>

            {trendValue && (
                <div className="flex items-center gap-2 mt-4 text-xs font-medium">
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full ${trendColor}`}>
                        <TrendIcon size={14} />
                        {trendValue}
                    </span>
                    <span className="text-slate-400">vs. mês passado</span>
                </div>
            )}
        </div>
    );
}
