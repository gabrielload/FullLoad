// src/fullLoad3d/FullLoad3d.jsx
import React, { useEffect, useRef, useState } from "react";
import Menu3D from "../fullload3d/menu3D";
import { jsPDF } from "jspdf";
import { Camera, FileDown, RefreshCw, Info, X, ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "../services/firebaseConfig";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";

import {
  initFullLoadEngine,
  clearScene,
  setBauDimensions,
  setGhostObject,
  addMercadoriaAuto,
  captureSnapshot,
  getPlacedItems,
  getBauState,
  setItems
} from "../fullload3d/fullLoadEngine";

export default function FullLoad3D() {
  const canvasRef = useRef(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const planId = queryParams.get("planId");
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
  //   ACTIONS
  // =============================
  const handleNewPlan = () => {
    if (window.confirm("Deseja limpar todo o plano de carga?")) {
      clearScene();
    }
  };

  const loadPlan = async (id) => {
    try {
      const empresaId = localStorage.getItem("empresaId");
      if (!empresaId) return;

      const docRef = doc(db, "empresas", empresaId, "planos_carga", id);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data.bau) {
          // Convert meters back to cm for setBauDimensions
          setBauDimensions(data.bau.L * 100, data.bau.H * 100, data.bau.W * 100);
        }
        if (data.items) {
          // Give engine a moment to reset bau
          setTimeout(() => {
            setItems(data.items);
          }, 100);
        }
        console.log("Plano carregado:", data.nome);
      } else {
        alert("Plano não encontrado.");
      }
    } catch (err) {
      console.error("Erro ao carregar plano:", err);
      alert("Erro ao carregar plano.");
    }
  };

  const handleScreenshot = () => {
    const dataURL = captureSnapshot("iso");
    if (dataURL) {
      const link = document.createElement("a");
      link.download = `screenshot_${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Helper to add header
    const addHeader = (title) => {
      doc.setFontSize(16);
      doc.text("FullLoad 3D — Relatório de Carga", 10, 10);
      doc.setFontSize(12);
      doc.text(title, 10, 18);
      doc.setFontSize(10);
      doc.text(`Data: ${new Date().toLocaleString()}`, 200, 10);
      doc.line(10, 22, pageWidth - 10, 22);
    };

    // Capture Views
    const imgIso = captureSnapshot("iso");
    const imgTop = captureSnapshot("top");
    const imgSide = captureSnapshot("side");
    const imgBack = captureSnapshot("back");

    // Page 1: Isometric
    if (imgIso) {
      addHeader("Vista Isométrica");
      // Center image
      doc.addImage(imgIso, "PNG", 20, 30, pageWidth - 40, pageHeight - 50);
    }

    // Page 2: Top
    if (imgTop) {
      doc.addPage();
      addHeader("Vista Superior");
      doc.addImage(imgTop, "PNG", 40, 30, pageWidth - 80, pageHeight - 50);
    }

    // Page 3: Side
    if (imgSide) {
      doc.addPage();
      addHeader("Vista Lateral");
      doc.addImage(imgSide, "PNG", 20, 50, pageWidth - 40, 100); // Side view is wide/short
    }

    // Page 4: Back
    if (imgBack) {
      doc.addPage();
      addHeader("Vista Traseira");
      doc.addImage(imgBack, "PNG", 80, 30, 120, 120); // Back view is square-ish
    }

    // Footer on last page
    doc.setFontSize(8);
    // =============================
    return (
      <div className="flex w-full h-screen bg-gray-50 overflow-hidden font-sans">

        {/* MENU LATERAL */}
        <Menu3D />

        {/* AREA PRINCIPAL */}
        <div className="flex-1 relative flex flex-col h-full">

          {/* TELA 3D */}
          <div className="flex-1 relative bg-gray-50 m-3 rounded-3xl shadow-inner border border-white/50 overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full h-full block outline-none"
            />

            {/* Floating Toolbar */}
            <div className="absolute top-6 right-6 flex flex-col gap-3 z-10">
              <ActionButton
                icon={<ArrowLeft className="w-5 h-5" />}
                label="Voltar"
                onClick={() => navigate("/Dashboard")}
                color="bg-white text-gray-700 hover:bg-gray-50"
              />
              <div className="h-px bg-gray-300 my-1 mx-2"></div>
              <ActionButton
                icon={<RefreshCw className="w-5 h-5" />}
                label="Novo Plano"
                onClick={handleNewPlan}
                color="bg-white text-gray-700 hover:bg-gray-50"
              />
              <ActionButton
                icon={<Camera className="w-5 h-5" />}
                label="Screenshot"
                onClick={handleScreenshot}
                color="bg-white text-gray-700 hover:bg-gray-50"
              />
              <ActionButton
                icon={<Save className="w-5 h-5" />}
                label="Salvar"
                onClick={handleSalvar}
                color="bg-green-600 text-white hover:bg-green-700"
              />
              <ActionButton
                icon={<FileDown className="w-5 h-5" />}
                label="Exportar PDF"
                onClick={handleExportPDF}
                color="bg-blue-600 text-white hover:bg-blue-700"
              />
              <div className="h-px bg-gray-300 my-1 mx-2"></div>
              <ActionButton
                icon={<Info className="w-5 h-5" />}
                label="Atalhos"
                onClick={() => setShowShortcuts(true)}
                color="bg-white text-gray-700 hover:bg-gray-50"
              />
            </div>

            {/* View Indicator / Overlay Info */}
            <div className="absolute bottom-6 left-6 pointer-events-none">
              <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/50 text-xs font-medium text-gray-600 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Engine 3D Ativa
              </div>
            </div>
          </div>
        </div>

        {/* Shortcuts Modal */}
        {showShortcuts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-800">Atalhos do Teclado</h3>
                <button onClick={() => setShowShortcuts(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <ShortcutKey k="R" desc="Rotacionar item (90°)" />
                <ShortcutKey k="Espaço" desc="Alternar visualização (Iso/Top/Side)" />
                <ShortcutKey k="G" desc="Alternar grade (Grid)" />
                <ShortcutKey k="Delete" desc="Remover item selecionado" />
                <ShortcutKey k="Setas" desc="Mover item selecionado (1cm)" />
                <ShortcutKey k="PageUp/Down" desc="Ajustar altura do fantasma" />
                <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
                  <p>💡 Clique em um item para selecionar. Clique no chão para posicionar.</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  function ActionButton({ icon, label, onClick, color }) {
    return (
      <button
        onClick={onClick}
        className={`group flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg shadow-gray-900/5 transition-all duration-200 hover:scale-105 ${color}`}
        title={label}
      >
        {icon}
        <span className="font-medium text-sm hidden group-hover:block animate-in slide-in-from-right-2 duration-200 whitespace-nowrap">
          {label}
        </span>
      </button>
    );
  }

  function ShortcutKey({ k, desc }) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{desc}</span>
        <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 min-w-[2rem] text-center">
          {k}
        </kbd>
      </div>
    );
  }
