// src/pages/FullLoad3d.jsx
import React, { useEffect, useRef, useState } from "react";
import Menu3D from "../fullload3d/menu3D";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Camera, FileDown, RefreshCw, Info, X, ArrowLeft, Save, List, AlertCircle, Box, ChevronUp, ChevronDown, Mouse, Keyboard, Loader2, Trash2, RotateCw, Move, Scale, Undo2, Redo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db, storage } from "../services/firebaseConfig";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import {
  initFullLoadEngine,
  clearScene,
  setBauDimensions,
  setGhostObject,
  addMercadoriaAuto,
  captureSnapshot,
  getPlacedItems,
  getBauState,
  setItems,
  optimizeLoad,

  handleDrop,
  undo,
  redo
} from "../fullload3d/fullLoadEngine";

export default function FullLoad3D() {
  const canvasRef = useRef(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorToast, setErrorToast] = useState(null);
  const [saveForm, setSaveForm] = useState({ documento: "", tipoCarga: "", processo: "" });
  const [currentItems, setCurrentItems] = useState([]);
  const [showControlsHUD, setShowControlsHUD] = useState(() => {
    const saved = localStorage.getItem("controlsHUD_visible");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [stats, setStats] = useState({ count: 0, weight: 0 });
  const [selectedItem, setSelectedItem] = useState(null);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Custom Modals State
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: null });
  const [showExportModal, setShowExportModal] = useState(false);
  const [successToast, setSuccessToast] = useState(null);
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const planId = queryParams.get("planId");

  useEffect(() => {
    localStorage.setItem("controlsHUD_visible", JSON.stringify(showControlsHUD));
  }, [showControlsHUD]);

  useEffect(() => {
    if (planId) {
      // Delay slightly to ensure engine is ready? 
      // Actually initFullLoadEngine is in another useEffect.
      // We might need to wait for engine init.
      // But loadPlan uses Firestore data then calls setBauDimensions and setItems.
      // setBauDimensions and setItems use the engine state or dispatch events?
      // In fullLoadEngine.js (which I can't see fully but inferred), they probably manipulate the scene.
      // If the scene is not ready, it might fail.
      // But init happens on mount.
      // Let's try calling it.
      loadPlan(planId);
    }
  }, [planId]);

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

    const handleError = (e) => {
      console.warn("⚠️ Erro 3D:", e.detail);
      setErrorToast(e.detail.message || "Erro desconhecido no motor 3D.");
      setTimeout(() => setErrorToast(null), 5000);
    };

    const handleItemSelected = (e) => {
      setSelectedItem(e.detail);
    };

    const handleItemDeselected = () => {
      setSelectedItem(null);
    };

    const handleUpdated = () => {
      const items = getPlacedItems();
      const totalWeight = items.reduce((acc, item) => acc + Number(item.meta?.peso || 0), 0);
      setStats({ count: items.length, weight: totalWeight });
    };

    const handleHistory = (e) => {
      setHistoryState(e.detail);
    };

    const handleOptimizing = (e) => {
      const { status, stats, unplaced } = e.detail;
      if (status === "start") {
        setIsOptimizing(true);
      } else if (status === "complete") {
        setIsOptimizing(false);
        setSuccess(`Otimização concluída! Eficiência: ${stats.volumeUtilization.toFixed(1)}%`);
        if (unplaced && unplaced.length > 0) {
          setTimeout(() => setError(`${unplaced.length} itens não puderam ser alocados.`), 2000);
        }
        setTimeout(() => setSuccess(""), 4000);
      } else if (status === "error") {
        setIsOptimizing(false);
      }
    };

    // ============================
    //   REGISTRAR LISTENERS
    // ============================
    window.addEventListener("3d_clear", handleClear);
    window.addEventListener("3d_setBau", handleSetBau);
    window.addEventListener("3d_setGhost", handleSetGhost);
    window.addEventListener("3d_addMercadoria", handleAddMercadoria);
    window.addEventListener("fullLoad_error", handleError);
    window.addEventListener("fullLoad_itemSelected", handleItemSelected);
    window.addEventListener("fullLoad_itemDeselected", handleItemDeselected);
    window.addEventListener("fullLoad_updated", handleUpdated);
    window.addEventListener("fullLoad_history", handleHistory);
    window.addEventListener("fullLoad_optimizing", handleOptimizing);

    // ============================
    //   CLEANUP CORRETO
    // ============================
    return () => {
      console.warn("🧹 Limpando listeners do FullLoad3D");

      window.removeEventListener("3d_clear", handleClear);
      window.removeEventListener("3d_setBau", handleSetBau);
      window.removeEventListener("3d_setGhost", handleSetGhost);
      window.removeEventListener("3d_addMercadoria", handleAddMercadoria);
      window.removeEventListener("fullLoad_error", handleError);
      window.removeEventListener("fullLoad_itemSelected", handleItemSelected);
      window.removeEventListener("fullLoad_itemSelected", handleItemSelected);
      window.removeEventListener("fullLoad_itemDeselected", handleItemDeselected);
      window.removeEventListener("fullLoad_updated", handleUpdated);
      window.removeEventListener("fullLoad_history", handleHistory);
      window.removeEventListener("fullLoad_optimizing", handleOptimizing);
    };
  }, []);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // =============================
  //   ACTIONS
  // =============================
  const handleNewPlan = () => {
    setConfirmModal({
      show: true,
      title: "Novo Plano",
      message: "Deseja limpar todo o plano de carga? Esta ação não pode ser desfeita.",
      onConfirm: () => {
        clearScene();
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null });
        setSuccessToast("Plano limpo com sucesso!");
        setTimeout(() => setSuccessToast(null), 3000);
      }
    });
  };

  const handleOptimize = () => {
    setConfirmModal({
      show: true,
      title: "Otimizar Carga",
      message: "Deseja reorganizar a carga automaticamente (Regra de Ouro)? Isso irá reposicionar todos os itens.",
      onConfirm: () => {
        optimizeLoad();
        setConfirmModal({ show: false, title: "", message: "", onConfirm: null });
      }
    });
  };

  const handleOpenSave = () => {
    setShowSaveModal(true);
  };

  const generatePDFBlob = async (docInfo = {}) => {
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const logoUrl = "/logo.png"; // Ensure this is accessible

    // Helper to load image
    const loadImage = (src) => new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });

    const logoImg = await loadImage(logoUrl);

    // Helper to add header
    const addHeader = (title) => {
      // Logo
      if (logoImg) {
        doc.addImage(logoImg, "PNG", 10, 5, 15, 15);
      }

      // Title
      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59); // Slate-800
      doc.text("FullLoad 3D", 30, 12);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text("Relatório de Carga", 30, 17);

      // Doc Info (Right aligned)
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // Slate-600
      const dateStr = new Date().toLocaleString();
      doc.text(dateStr, pageWidth - 10, 10, { align: "right" });

      if (docInfo.documento) {
        doc.text(`Doc: ${docInfo.documento}`, pageWidth - 10, 15, { align: "right" });
      }
      if (docInfo.tipoCarga) {
        doc.text(`Tipo: ${docInfo.tipoCarga}`, pageWidth - 10, 20, { align: "right" });
      }

      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.line(10, 25, pageWidth - 10, 25);

      // Page Title
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text(title, 10, 35);
    };

    // Capture Views
    const imgIso = captureSnapshot("iso");
    const imgTop = captureSnapshot("top");
    const imgSide = captureSnapshot("side");
    const imgBack = captureSnapshot("back");

    // Page 1: Isometric (Maximized)
    if (imgIso) {
      addHeader("Vista Isométrica");
      // Maximize image area: Start Y=40, Margin=10
      // Available Height = PageHeight - 40 - 10 = 297 - 50 = 247 (approx)
      doc.addImage(imgIso, "PNG", 10, 40, pageWidth - 20, pageHeight - 50);
    }

    // Page 2: Top & Side (Combined if possible, or separate)
    // Let's keep separate for clarity but maximize them
    if (imgTop) {
      doc.addPage();
      addHeader("Vista Superior");
      doc.addImage(imgTop, "PNG", 10, 40, pageWidth - 20, pageHeight - 50);
    }

    if (imgSide) {
      doc.addPage();
      addHeader("Vista Lateral");
      doc.addImage(imgSide, "PNG", 10, 40, pageWidth - 20, pageHeight - 50);
    }

    if (imgBack) {
      doc.addPage();
      addHeader("Vista Traseira");
      doc.addImage(imgBack, "PNG", 10, 40, pageWidth - 20, pageHeight - 50);
    }

    // Page 5: Item List
    doc.addPage();
    addHeader("Lista de Itens");

    const items = getPlacedItems();
    const tableColumn = ["Item", "Dimensões (cm)", "Peso (kg)", "Qtd", "Total (kg)"];
    const itemsMap = {};

    items.forEach(item => {
      const name = item.meta?.nome || "Item";
      const dims = `${(item.scale[0] * 100).toFixed(0)}x${(item.scale[1] * 100).toFixed(0)}x${(item.scale[2] * 100).toFixed(0)}`;
      const weight = Number(item.meta?.peso || 0);
      const key = `${name}-${dims}-${weight}`;

      if (!itemsMap[key]) itemsMap[key] = { name, dims, weight, count: 0 };
      itemsMap[key].count++;
    });

    const tableRows = Object.values(itemsMap).map(i => [
      i.name,
      i.dims,
      i.weight.toFixed(1),
      i.count,
      (i.weight * i.count).toFixed(1)
    ]);

    // Add Total Row
    const totalWeight = items.reduce((acc, item) => acc + Number(item.meta?.peso || 0), 0);
    const totalCount = items.length;

    tableRows.push([
      { content: 'TOTAL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } },
      { content: totalCount, styles: { fontStyle: 'bold' } },
      { content: totalWeight.toFixed(1), styles: { fontStyle: 'bold' } }
    ]);

    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    return doc.output("blob");
  };

  const handleConfirmSave = async () => {
    // Processo is now optional
    if (!saveForm.documento || !saveForm.tipoCarga) {
      setErrorToast("Preencha Documento e Tipo de Carga para salvar.");
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }

    try {
      setSaving(true);
      const empresaId = localStorage.getItem("empresaId");
      if (!empresaId) return;

      const items = getPlacedItems();
      const bau = getBauState();

      // 1. Generate PDF Blob with Info
      const pdfBlob = await generatePDFBlob(saveForm);

      // 2. Upload to Storage
      const filename = `${Date.now()}_manifesto_${saveForm.documento}.pdf`;
      const storageRef = ref(storage, `planos/${empresaId}/${filename}`);
      await uploadBytes(storageRef, pdfBlob);
      const pdfUrl = await getDownloadURL(storageRef);

      // 3. Save to Firestore
      await addDoc(collection(db, "empresas", empresaId, "planos_carga"), {
        nome: `Plano ${saveForm.documento}`,
        documento: saveForm.documento,
        tipoCarga: saveForm.tipoCarga,
        processo: saveForm.processo || "", // Optional
        dataCriacao: new Date().toISOString(),
        items,
        bau,
        pdfUrl // Save the URL
      });

      // 4. Auto Download PDF (Requested by User)
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `plano_carga_${saveForm.documento}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      setSuccessToast("Plano salvo e PDF baixado com sucesso!");
      setTimeout(() => setSuccessToast(null), 3000);
      setShowSaveModal(false);
      setSaveForm({ documento: "", tipoCarga: "", processo: "" });
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setErrorToast("Erro ao salvar plano.");
      setTimeout(() => setErrorToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenList = () => {
    const items = getPlacedItems();
    setCurrentItems(items);
    setShowListModal(true);
  };

  const loadPlan = async (id) => {
    try {
      const empresaId = localStorage.getItem("empresaId");
      if (!empresaId) return;

      const docRef = doc(db, "empresas", empresaId, "planos_carga", id);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data();

        if (!data.bau) {
          console.error("Plano corrompido: Sem dados do baú.");
          alert("Este plano está corrompido (sem dados do veículo).");
          return;
        }

        if (data.bau) {
          setBauDimensions(data.bau.L * 100, data.bau.H * 100, data.bau.W * 100);
        }
        if (data.items && Array.isArray(data.items)) {
          setTimeout(() => {
            try {
              setItems(data.items);
            } catch (e) {
              console.error("Erro ao definir itens:", e);
            }
          }, 500);
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
    setShowExportModal(true);
  };

  const confirmExportPDF = async () => {
    setShowExportModal(false);
    const docInfo = { ...saveForm };

    const blob = await generatePDFBlob(docInfo);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `plano_carga_${docInfo.documento || "export"}.pdf`;
    link.click();
    URL.revokeObjectURL(url);

    setSuccessToast("PDF gerado com sucesso!");
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // =============================
  return (
    <div className="flex w-full h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Error Toast */}
      {errorToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium text-sm">{errorToast}</span>
          <button onClick={() => setErrorToast(null)} className="p-1 hover:bg-white/20 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300">
          <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span className="font-medium text-sm">{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="p-1 hover:bg-white/20 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MENU LATERAL */}
      <Menu3D />

      {/* AREA PRINCIPAL */}
      <div className="flex-1 relative flex flex-col h-full">

        {/* TELA 3D */}
        {/* TELA 3D */}
        <div className="flex-1 relative bg-slate-100 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/0 via-slate-100/20 to-slate-200/40 pointer-events-none" />
          <canvas
            ref={canvasRef}
            className="w-full h-full block outline-none"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const data = e.dataTransfer.getData("application/json");
              if (data) {
                try {
                  const mercadoria = JSON.parse(data);
                  // Use handleDrop from engine for precise placement
                  handleDrop(e.clientX, e.clientY, mercadoria);
                } catch (err) {
                  console.error("Erro ao soltar item:", err);
                }
              }
            }}
          />

          {/* Selection HUD */}
          {selectedItem && (
            <div className="absolute top-24 right-6 bg-slate-900/95 backdrop-blur-xl p-5 rounded-3xl shadow-2xl border border-slate-700 w-72 animate-in slide-in-from-right-8 duration-300 ring-1 ring-black/50">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-white text-base leading-tight">{selectedItem.item.nome}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-wider">ID: {selectedItem.id.slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700 text-center group hover:bg-orange-500/10 hover:border-orange-500/30 transition-colors">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1 group-hover:text-orange-400">Comp</span>
                  <span className="font-bold text-white text-sm">{selectedItem.item.comprimento || selectedItem.item.L}</span>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700 text-center group hover:bg-orange-500/10 hover:border-orange-500/30 transition-colors">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1 group-hover:text-orange-400">Larg</span>
                  <span className="font-bold text-white text-sm">{selectedItem.item.largura || selectedItem.item.W}</span>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700 text-center group hover:bg-orange-500/10 hover:border-orange-500/30 transition-colors">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1 group-hover:text-orange-400">Alt</span>
                  <span className="font-bold text-white text-sm">{selectedItem.item.altura || selectedItem.item.H}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))}
                  className="flex-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:scale-105 active:scale-95 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-sm border border-blue-500/20"
                  title="Girar (R)"
                >
                  <RotateCw size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Girar</span>
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("fullLoad_remove", { detail: { colocId: selectedItem.id } }))}
                  className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:scale-105 active:scale-95 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-sm border border-red-500/20"
                  title="Excluir (Del)"
                >
                  <Trash2 size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Excluir</span>
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1.5">
                <div className="flex gap-0.5">
                  <div className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center border border-slate-700">←</div>
                  <div className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center border border-slate-700">↑</div>
                  <div className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center border border-slate-700">↓</div>
                  <div className="w-4 h-4 rounded bg-slate-800 flex items-center justify-center border border-slate-700">→</div>
                </div>
                <span>Mover item</span>
              </div>
            </div>
          )}

          {/* Logo Overlay */}
          <div className="absolute top-20 right-6 z-0 pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
                <img src="/logo.png" className="w-5 h-5 invert brightness-0" alt="Logo" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">FullLoad<span className="text-orange-500">3D</span></h1>
              </div>
            </div>
          </div>

          {/* Stats HUD */}
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

          {/* Loading Overlay */}
          {isOptimizing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm">
              <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
              <h2 className="text-2xl font-bold text-white">Otimizando Carga...</h2>
              <p className="text-slate-300">Aplicando Regra de Ouro</p>
            </div>
          )}

          {/* Back Button (Top Left) */}
          <div className="absolute top-6 left-6 z-50">
            <ActionButton
              icon={<ArrowLeft className="w-5 h-5" />}
              label="Voltar"
              onClick={() => navigate("/Dashboard")}
              color="bg-slate-900/90 backdrop-blur-xl text-slate-200 hover:bg-slate-800 hover:text-white border border-slate-700 shadow-lg shadow-black/20"
            />
          </div>

          {/* Bottom Toolbar (Figma Style) */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-slate-700 ring-1 ring-black/50 animate-in slide-in-from-bottom-10 duration-500">

            {/* Undo/Redo Group */}
            <div className="flex gap-1 mr-2">
              <button
                onClick={undo}
                disabled={!historyState.canUndo}
                className={`p-3 rounded-xl transition-all ${historyState.canUndo ? 'text-slate-200 hover:bg-slate-800 hover:text-white hover:scale-110' : 'text-slate-600 cursor-not-allowed'}`}
                title="Desfazer (Ctrl+Z)"
              >
                <Undo2 className="w-5 h-5" />
              </button>
              <button
                onClick={redo}
                disabled={!historyState.canRedo}
                className={`p-3 rounded-xl transition-all ${historyState.canRedo ? 'text-slate-200 hover:bg-slate-800 hover:text-white hover:scale-110' : 'text-slate-600 cursor-not-allowed'}`}
                title="Refazer (Ctrl+Y)"
              >
                <Redo2 className="w-5 h-5" />
              </button>
            </div>

            <div className="w-px h-8 bg-slate-700 mx-1"></div>

            {/* Main Actions */}
            <ActionButton
              icon={<Box className="w-5 h-5" />}
              label="Otimizar"
              onClick={optimizeLoad}
              color="text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
              minimal
            />

            <div className="w-px h-8 bg-slate-700 mx-1"></div>

            <ActionButton
              icon={<RefreshCw className="w-5 h-5" />}
              label="Novo"
              onClick={handleNewPlan}
              color="text-slate-200 hover:bg-slate-800 hover:text-white"
              minimal
            />
            <ActionButton
              icon={<Camera className="w-5 h-5" />}
              label="Print"
              onClick={handleScreenshot}
              color="text-slate-200 hover:bg-slate-800 hover:text-white"
              minimal
            />
            <ActionButton
              icon={<Save className="w-5 h-5" />}
              label="Salvar"
              onClick={handleOpenSave}
              color="text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              minimal
            />
            <ActionButton
              icon={<List className="w-5 h-5" />}
              label="Lista"
              onClick={handleOpenList}
              color="text-slate-200 hover:bg-slate-800 hover:text-white"
              minimal
            />
            <ActionButton
              icon={<FileDown className="w-5 h-5" />}
              label="PDF"
              onClick={handleExportPDF}
              color="text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
              minimal
            />

            <div className="w-px h-8 bg-slate-700 mx-1"></div>

            <ActionButton
              icon={<Info className="w-5 h-5" />}
              label="Atalhos"
              onClick={() => setShowShortcuts(true)}
              color="text-slate-200 hover:bg-slate-800 hover:text-white"
              minimal
            />
          </div>

          {/* Controls HUD */}
          <div className="absolute bottom-6 left-6 z-20">
            <div className={`bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700 transition-all duration-300 ring-1 ring-black/50 ${showControlsHUD ? 'w-80' : 'w-auto'}`}>
              {/* HUD Header */}
              <div className="flex items-center justify-between p-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-slate-200">Controles</span>
                </div>
                <button
                  onClick={() => setShowControlsHUD(!showControlsHUD)}
                  className="p-1 hover:bg-slate-800 rounded-lg transition-colors pointer-events-auto"
                  title={showControlsHUD ? "Minimizar" : "Expandir"}
                >
                  {showControlsHUD ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                </button>
              </div>

              {/* HUD Content */}
              {showControlsHUD && (
                <div className="p-4 space-y-4 text-xs">
                  {/* Mouse Controls */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Mouse className="w-4 h-4 text-orange-500" />
                      <h4 className="font-bold text-slate-200">Mouse</h4>
                    </div>
                    <div className="space-y-1.5 pl-6">
                      <ControlItem label="Clique Esquerdo" desc="Posicionar item" />
                      <ControlItem label="Clique Direito" desc="Rotacionar câmera" />
                      <ControlItem label="Scroll" desc="Zoom in/out" />
                      <ControlItem label="Shift + Clique" desc="Preencher coluna" />
                      <ControlItem label="Alt + Clique" desc="Empilhar lateral" />
                    </div>
                  </div>

                  {/* Keyboard Controls */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Keyboard className="w-4 h-4 text-orange-500" />
                      <h4 className="font-bold text-slate-200">Teclado</h4>
                    </div>
                    <div className="space-y-1.5 pl-6">
                      <ControlItem label="R" desc="Rotacionar item" />
                      <ControlItem label="Delete" desc="Remover item" />
                      <ControlItem label="G" desc="Alternar grade" />
                      <ControlItem label="V" desc="Mudar visualização" />
                      <ControlItem label="Setas" desc="Mover item" />
                      <ControlItem label="Esc" desc="Cancelar" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shortcuts Modal */}
      {
        showShortcuts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">Atalhos do Teclado</h3>
                <button onClick={() => setShowShortcuts(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <ShortcutKey k="R" desc="Rotacionar item (90°)" />
                <ShortcutKey k="Espaço" desc="Alternar visualização (Iso/Top/Side)" />
                <ShortcutKey k="G" desc="Alternar grade (Grid)" />
                <ShortcutKey k="Delete" desc="Remover item selecionado" />
                <ShortcutKey k="Setas" desc="Mover item selecionado (1cm)" />
                <ShortcutKey k="V" desc="Empilhar Vertical (Duplicar no topo)" />
                <ShortcutKey k="H" desc="Empilhar Horizontal (Duplicar ao lado)" />
                <ShortcutKey k="PageUp/Down" desc="Ajustar altura do fantasma" />
                <div className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100">
                  <p>💡 Clique em um item para selecionar. Clique no chão para posicionar.</p>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Save Modal */}
      {
        showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Salvar Plano de Carga</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Documento <span className="text-red-500">*</span></label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" value={saveForm.documento} onChange={e => setSaveForm({ ...saveForm, documento: e.target.value })} placeholder="Ex: NF-1234" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Carga <span className="text-red-500">*</span></label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" value={saveForm.tipoCarga} onChange={e => setSaveForm({ ...saveForm, tipoCarga: e.target.value })} placeholder="Ex: Eletrônicos" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Processo (Opcional)</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" value={saveForm.processo} onChange={e => setSaveForm({ ...saveForm, processo: e.target.value })} placeholder="Ex: PROC-001" />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancelar</button>
                  <button onClick={handleConfirmSave} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? "Salvando..." : "Salvar e Baixar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Export Modal */}
      {
        showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Exportar PDF</h3>
              <p className="text-sm text-slate-500 mb-4">Preencha as informações para o cabeçalho do relatório (opcional).</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Documento</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={saveForm.documento} onChange={e => setSaveForm({ ...saveForm, documento: e.target.value })} placeholder="Ex: NF-1234" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Carga</label>
                  <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={saveForm.tipoCarga} onChange={e => setSaveForm({ ...saveForm, tipoCarga: e.target.value })} placeholder="Ex: Eletrônicos" />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancelar</button>
                  <button onClick={confirmExportPDF} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                    <FileDown className="w-4 h-4" />
                    Gerar PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Confirmation Modal */}
      {
        confirmModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 p-6">
              <div className="flex items-center gap-3 mb-4 text-amber-500">
                <AlertCircle className="w-8 h-8" />
                <h3 className="text-xl font-bold text-slate-800">{confirmModal.title}</h3>
              </div>
              <p className="text-slate-600 mb-6">{confirmModal.message}</p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmModal({ show: false, title: "", message: "", onConfirm: null })}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-bold shadow-lg shadow-amber-500/20 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* List Modal */}
      {
        showListModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">Itens no Caminhão ({currentItems.length})</h3>
                <button onClick={() => setShowListModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                {currentItems.length === 0 ? (
                  <div className="text-center py-10">
                    <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Nenhum item carregado.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-100">
                        <th className="pb-2 pl-2">Item</th>
                        <th className="pb-2">Posição (x, y, z)</th>
                        <th className="pb-2 pr-2">Dimensões</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentItems.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 pl-2 font-medium text-slate-900">{item.meta?.nome || "Item"}</td>
                          <td className="py-3 text-slate-600 font-mono text-xs">
                            {item.position[0].toFixed(0)}, {item.position[1].toFixed(0)}, {item.position[2].toFixed(0)}
                          </td>
                          <td className="py-3 pr-2 text-slate-600 font-mono text-xs">
                            {item.scale[0].toFixed(0)}x{item.scale[1].toFixed(0)}x{item.scale[2].toFixed(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
}

function ActionButton({ icon, label, onClick, color, minimal }) {
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

function ShortcutKey({ k, desc }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{desc}</span>
      <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 min-w-[2rem] text-center shadow-sm">
        {k}
      </kbd>
    </div>
  );
}

function ControlItem({ label, desc }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-bold text-slate-300 whitespace-nowrap flex-shrink-0">
        {label}
      </kbd>
      <span className="text-slate-400 text-[11px] leading-tight">{desc}</span>
    </div>
  );
}
