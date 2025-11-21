import React from "react";
import { Link } from "react-router-dom";

export default function Sidebar(){
  return (
    <aside className="w-60 bg-[#070707] min-h-screen border-r border-white/5 p-4 fixed">
      <div className="mb-6">
        <img src="/logo-fullload.png" alt="logo" className="w-10 h-10 inline-block" />
        <span className="ml-2 text-orange-400 font-semibold">FullLoad 3D</span>
      </div>
      <nav className="flex flex-col gap-2">
        <Link to="/admin" className="text-white p-2 rounded hover:bg-white/5">Painel</Link>
        <Link to="/admin/cargas" className="text-white p-2 rounded hover:bg-white/5">Cargas</Link>
        <Link to="/usuarios" className="text-white p-2 rounded hover:bg-white/5">Usuários</Link>
        <Link to="/faturamento" className="text-white p-2 rounded hover:bg-white/5">Faturamento</Link>
        <a href="/fullLoad3d" className="mt-4 inline-block bg-orange-600 text-white px-3 py-2 rounded">Abrir FullLoad (3D)</a>
      </nav>
    </aside>
  );
}
