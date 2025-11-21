// src/fullLoad3d/FullLoad3d.jsx
import React, { useEffect, useRef } from "react";
import Menu3D from "../fullload3d/menu3D";

import { initFullLoadEngine, clearScene, setBauDimensions, setGhostObject, addMercadoriaAuto } from "../fullload3d/fullLoadEngine";


export default function FullLoad3D() {
  const canvasRef = useRef(null);

  // =============================
  //   INICIAR ENGINE 3D
  // =============================
  useEffect(() => {
    if (!canvasRef.current) return;

    console.log("🟧 Inicializando FullLoad Engine 3D...");
    initFullLoadEngine(canvasRef.current);

    // ============================
    //  HANDLERS: nomes fixos p/ remover certo
    // ============================
    const handleClear = () => {
      console.log("🧹 Limpando cena 3D...");
      clearScene();
    };

    const handleSetBau = (e) => {
      console.log("📦 Configurando baú:", e.detail);
      const { L, H, W } = e.detail;
      setBauDimensions(L, H, W);
    };

    const handleSetGhost = (e) => {
      console.log("👻 Ghost recebido:", e.detail);
      setGhostObject(e.detail);
    };

    const handleAddMercadoria = (e) => {
      console.log("📥 Inserindo mercadoria:", e.detail);
      const { mercadoria, quantidade } = e.detail;
      addMercadoriaAuto(mercadoria, quantidade);
    };

    // ============================
    //   REGISTRAR LISTENERS
    // ============================
    window.addEventListener("3d_clear", handleClear);
    window.addEventListener("3d_setBau", handleSetBau);
    window.addEventListener("3d_setGhost", handleSetGhost);
    window.addEventListener("3d_addMercadoria", handleAddMercadoria);

    // ============================
    //   CLEANUP CORRETO
    // ============================
    return () => {
      console.warn("🧹 Limpando listeners do FullLoad3D");

      window.removeEventListener("3d_clear", handleClear);
      window.removeEventListener("3d_setBau", handleSetBau);
      window.removeEventListener("3d_setGhost", handleSetGhost);
      window.removeEventListener("3d_addMercadoria", handleAddMercadoria);
    };
  }, []);

  // =============================
  //   LAYOUT: Menu + Tela 3D
  // =============================
  return (
    <div className="flex w-full h-screen bg-gray-100 p-3 gap-3">
      
      {/* MENU LATERAL */}
      <Menu3D />

      {/* TELA 3D */}
      <div className="flex-1 bg-black rounded-2xl shadow-xl relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-2xl"
        />
      </div>

    </div>
  );
}
