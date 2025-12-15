// src/pages/FullLoad3d.jsx
import React, { useEffect, useRef, useState } from "react";
import Menu3D from "../fullload3d/menu3D";
import { generatePDFBlob } from "../utils/pdfGenerator";
import { Camera, RefreshCw, Info, X, ArrowLeft, Save, List, AlertCircle, Box, Loader2, Trash2, RotateCw, Scale } from "lucide-react";
import ActionButton from "../components/fullload3d/hud/ActionButton";
import SaveModal from "../components/fullload3d/modals/SaveModal";
import ListModal from "../components/fullload3d/modals/ListModal";
import ShortcutsModal from "../components/fullload3d/modals/ShortcutsModal";
import ExportModal from "../components/fullload3d/modals/ExportModal";
import ControlsHUD from "../components/fullload3d/hud/ControlsHUD";
import StatsHUD from "../components/fullload3d/hud/StatsHUD";
import Toolbar from "../components/fullload3d/hud/Toolbar";
import StatusIndicator from "../components/fullload3d/hud/StatusIndicator";
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
  const [isLoadingPlan, setIsLoadingPlan] = useState(!!new URLSearchParams(window.location.search).get("planId"));
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle, saving, saved, error

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
    if (planId && isEngineReady) {
      console.log("🚀 Loading plan:", planId);
      loadPlan(planId);
    }
  }, [planId, isEngineReady]);

  useEffect(() => {
    if (!canvasRef.current) return;

    console.log("🟧 Inicializando FullLoad Engine 3D...");
    initFullLoadEngine(canvasRef.current);
    setIsEngineReady(true);

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
      // Immediately save to localStorage
      localStorage.setItem("fullload_autosave_bau", JSON.stringify({ L, H, W }));
      console.log("💾 Baú salvo no autosave");
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
      setCurrentItems(items); // Sync currentItems with engine
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
        setSuccessToast(`Otimização concluída! Eficiência: ${stats.volumeUtilization.toFixed(1)}%`);
        if (unplaced && unplaced.length > 0) {
          setTimeout(() => setErrorToast(`${unplaced.length} itens não puderam ser alocados.`), 2000);
        }
        setTimeout(() => setSuccessToast(null), 4000);
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

  // ============================
  //   AUTO-SAVE & AUTO-RESTORE
  // ============================
  // Auto-restore from localStorage on mount
  // Auto-restore from localStorage on mount (ONLY if NOT loading a specific plan)
  useEffect(() => {
    if (!isEngineReady) return;

    // If we are loading a specific plan (planId exists), DO NOT restore from autosave
    if (planId) {
      console.log("🚫 Ignorando autosave pois um PlanID foi fornecido.");
      return;
    }

    try {
      const savedBau = localStorage.getItem("fullload_autosave_bau");
      const savedItems = localStorage.getItem("fullload_autosave_items");

      if (savedBau) {
        let bau = JSON.parse(savedBau);
        console.log("🔄 Restaurando baú do autosave:", bau);

        // CORRECTION: Auto-save stores METERS, but setBauDimensions expects CM.
        // Heuristic: If L is small (< 100), it's likely meters.
        const boxL = Number(bau.L);
        const boxH = Number(bau.H);
        const boxW = Number(bau.W);

        const isMeters = boxL < 50; // 50m is a huge truck, so < 50 is safely meters
        const factor = isMeters ? 100 : 1;

        setBauDimensions(boxL * factor, boxH * factor, boxW * factor);
      }

      if (savedItems) {
        const items = JSON.parse(savedItems);
        console.log("🔄 Restaurando itens do autosave:", items.length, "itens");
        setTimeout(() => {
          setItems(items);
        }, 500); // Small delay to ensure bau is loaded first
      }
    } catch (err) {
      console.error("Erro ao restaurar autosave:", err);
    }
  }, [isEngineReady, planId]);

  // Auto-save on state changes
  useEffect(() => {
    if (!isEngineReady) return;

    const handleAutoSave = () => {
      try {
        const items = getPlacedItems();
        const bau = getBauState();

        if (bau) {
          localStorage.setItem("fullload_autosave_bau", JSON.stringify(bau));
        }

        if (items && items.length > 0) {
          localStorage.setItem("fullload_autosave_items", JSON.stringify(items));
        } else {
          localStorage.removeItem("fullload_autosave_items");
        }

        console.log("💾 Autosave:", items.length, "itens");
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch (err) {
        console.error("Erro ao salvar autosave:", err);
        setSaveStatus("error");
      }
    };

    // Listen to updates and save
    const handleUpdateAndSave = () => {
      setSaveStatus("saving");
      // Debounce slightly to show "Saving..."
      setTimeout(handleAutoSave, 500);
    };

    window.addEventListener("fullLoad_updated", handleUpdateAndSave);

    return () => {
      window.removeEventListener("fullLoad_updated", handleUpdateAndSave);
    };
  }, [isEngineReady]);


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
        // Clear autosave
        localStorage.removeItem("fullload_autosave_bau");
        localStorage.removeItem("fullload_autosave_items");
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
        if (data.items && isEngineReady) { // Only load items when engine is ready
          console.log("📍 Engine Ready, loading items into scene...");
          try {
            // Explicitly clear scene before loading to ensure clean state
            clearScene();

            // Allow a tiny microtask delay for clear to process if needed
            setTimeout(() => {
              setItems(data.items);
              setCurrentItems(data.items);
              setIsLoadingPlan(false); // Done loading
            }, 50);
          } catch (e) {
            console.error("Erro ao definir itens:", e);
          }
        } else if (!data.items) {
          setIsLoadingPlan(false); // Done (no items)
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
    const dataURL = captureSnapshot("current");
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
          <StatsHUD stats={stats} />

          {/* Auto-Save Indicator */}
          <StatusIndicator status={saveStatus} />

          {/* Initial Loading Screen */}
          {isLoadingPlan && (
            <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950 text-white animate-out fade-out duration-500 fill-mode-forwards">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-slate-800 border-t-orange-500 animate-spin"></div>
                <Box className="absolute inset-0 m-auto w-8 h-8 text-slate-600" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">Carregando Plano...</h2>
              <p className="text-slate-500 text-sm mt-2">Preparando o ambiente 3D</p>
            </div>
          )}

          {/* Loading Overlay (Optimizing) */}
          {isOptimizing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-orange-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Box className="w-6 h-6 text-white animate-pulse" />
                </div>
              </div>
              <h2 className="mt-6 text-2xl font-bold text-white tracking-tight">Otimizando Carga...</h2>
              <p className="text-slate-400 mt-2 font-medium">Aplicando Regra de Ouro (Algoritmo Genético)</p>
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

          {/* Bottom Toolbar */}
          <Toolbar
            undo={undo}
            redo={redo}
            historyState={historyState}
            onOptimize={handleOptimize}
            onNewPlan={handleNewPlan}
            onScreenshot={handleScreenshot}
            onSave={handleOpenSave}
            onList={handleOpenList}
            onPDF={handleExportPDF}
            onShortcuts={() => setShowShortcuts(true)}
            items={currentItems}
          />

          {/* Controls HUD */}
          <ControlsHUD
            showControlsHUD={showControlsHUD}
            setShowControlsHUD={setShowControlsHUD}
          />
        </div>
      </div>

      {/* Shortcuts Modal */}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Save Modal */}
      {/* Save Modal */}
      {showSaveModal && (
        <SaveModal
          onClose={() => setShowSaveModal(false)}
          onConfirm={handleConfirmSave}
          saveForm={saveForm}
          setSaveForm={setSaveForm}
          saving={saving}
        />
      )}

      {/* Export Modal */}
      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          onConfirm={confirmExportPDF}
          saveForm={saveForm}
          setSaveForm={setSaveForm}
        />
      )}

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
      {/* List Modal */}
      {showListModal && (
        <ListModal
          onClose={() => setShowListModal(false)}
          items={currentItems}
        />
      )}

    </div >
  );
}


