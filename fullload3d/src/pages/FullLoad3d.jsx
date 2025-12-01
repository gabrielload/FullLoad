// src/pages/FullLoad3d.jsx
import React, { useEffect, useRef, useState } from "react";
import Menu3D from "../fullload3d/menu3D";
import { jsPDF } from "jspdf";
import { Camera, FileDown, RefreshCw, Info, X, ArrowLeft, Save, List, AlertCircle, Box, ChevronUp, ChevronDown, Mouse, Keyboard } from "lucide-react";
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
  optimizeLoad
} from "../fullload3d/fullLoadEngine";

export default function FullLoad3D() {
  const canvasRef = useRef(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [errorToast, setErrorToast] = useState(null);
  const [saveForm, setSaveForm] = useState({ documento: "", tipoCarga: "", processo: "" });
  const [currentItems, setCurrentItems] = useState([]);
  const [showControlsHUD, setShowControlsHUD] = useState(() => {
    const saved = localStorage.getItem("controlsHUD_visible");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(window.location.search);
  const planId = queryParams.get("planId");

  useEffect(() => {
    localStorage.setItem("controlsHUD_visible", JSON.stringify(showControlsHUD));
  }, [showControlsHUD]);

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

    // ============================
    //   REGISTRAR LISTENERS
    // ============================
    window.addEventListener("3d_clear", handleClear);
    window.addEventListener("3d_setBau", handleSetBau);
    window.addEventListener("3d_setGhost", handleSetGhost);
    window.addEventListener("3d_addMercadoria", handleAddMercadoria);
    window.addEventListener("fullLoad_error", handleError);

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

  const handleOptimize = () => {
    if (window.confirm("Deseja reorganizar a carga automaticamente (Regra de Ouro)? Isso irá reposicionar todos os itens.")) {
      optimizeLoad();
    }
  };

  const handleOpenSave = () => {
    setShowSaveModal(true);
  };

  const generatePDFBlob = () => {
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
      doc.addImage(imgSide, "PNG", 20, 50, pageWidth - 40, 100);
    }

    // Page 4: Back
    if (imgBack) {
      doc.addPage();
      addHeader("Vista Traseira");
      doc.addImage(imgBack, "PNG", 20, 40, pageWidth - 40, (pageWidth - 40));
    }

    // Footer
    doc.setFontSize(8);
    return doc.output("blob");
  };

  const handleConfirmSave = async () => {
    if (!saveForm.documento || !saveForm.tipoCarga || !saveForm.processo) {
      alert("Preencha todos os campos para salvar.");
      return;
    }

    try {
      const empresaId = localStorage.getItem("empresaId");
      if (!empresaId) return;

      const items = getPlacedItems();
      const bau = getBauState();

      // 1. Generate PDF Blob
      const pdfBlob = generatePDFBlob();

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
        processo: saveForm.processo,
        dataCriacao: new Date().toISOString(),
        items,
        bau,
        pdfUrl // Save the URL
      });

      alert("Plano e PDF salvos com sucesso!");
      setShowSaveModal(false);
      setSaveForm({ documento: "", tipoCarga: "", processo: "" });
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar plano.");
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
    const blob = generatePDFBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plano_carga.pdf";
    link.click();
    URL.revokeObjectURL(url);
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

      {/* MENU LATERAL */}
      <Menu3D />

      {/* AREA PRINCIPAL */}
      <div className="flex-1 relative flex flex-col h-full">

        {/* TELA 3D */}
        <div className="flex-1 relative bg-gradient-to-br from-slate-100 to-slate-200 m-3 rounded-3xl shadow-inner border border-white/50 overflow-hidden">
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
              color="bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white hover:text-orange-600"
            />
            <div className="h-px bg-slate-300/50 my-1 mx-2"></div>
            <ActionButton
              icon={<RefreshCw className="w-5 h-5" />}
              label="Novo Plano"
              onClick={handleNewPlan}
              color="bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white hover:text-orange-600"
            />
            <ActionButton
              icon={<Camera className="w-5 h-5" />}
              label="Screenshot"
              onClick={handleScreenshot}
              color="bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white hover:text-orange-600"
            />
            <ActionButton
              icon={<Save className="w-5 h-5" />}
              label="Salvar"
              onClick={handleOpenSave}
              color="bg-emerald-500/90 backdrop-blur-sm text-white hover:bg-emerald-600"
            />
            <ActionButton
              icon={<List className="w-5 h-5" />}
              label="Lista de Itens"
              onClick={handleOpenList}
              color="bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white hover:text-orange-600"
            />
            <ActionButton
              icon={<FileDown className="w-5 h-5" />}
              label="Exportar PDF"
              onClick={handleExportPDF}
              color="bg-blue-500/90 backdrop-blur-sm text-white hover:bg-blue-600"
            />
            <div className="h-px bg-slate-300/50 my-1 mx-2"></div>
            <ActionButton
              icon={<Info className="w-5 h-5" />}
              label="Atalhos"
              onClick={() => setShowShortcuts(true)}
              color="bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white hover:text-orange-600"
            />
          </div>

          {/* Controls HUD */}
          <div className="absolute bottom-6 left-6 z-20">
            <div className={`bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 transition-all duration-300 ${showControlsHUD ? 'w-80' : 'w-auto'}`}>
              {/* HUD Header */}
              <div className="flex items-center justify-between p-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-slate-700">Controles</span>
                </div>
                <button
                  onClick={() => setShowControlsHUD(!showControlsHUD)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors pointer-events-auto"
                  title={showControlsHUD ? "Minimizar" : "Expandir"}
                >
                  {showControlsHUD ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronUp className="w-4 h-4 text-slate-600" />}
                </button>
              </div>

              {/* HUD Content */}
              {showControlsHUD && (
                <div className="p-4 space-y-4 text-xs">
                  {/* Mouse Controls */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Mouse className="w-4 h-4 text-orange-500" />
                      <h4 className="font-bold text-slate-700">Mouse</h4>
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
                      <h4 className="font-bold text-slate-700">Teclado</h4>
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
      {showShortcuts && (
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
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 p-6">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Salvar Plano de Carga</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Documento</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" value={saveForm.documento} onChange={e => setSaveForm({ ...saveForm, documento: e.target.value })} placeholder="Ex: NF-1234" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Carga</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" value={saveForm.tipoCarga} onChange={e => setSaveForm({ ...saveForm, tipoCarga: e.target.value })} placeholder="Ex: Eletrônicos" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Processo</label>
                <input className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all" value={saveForm.processo} onChange={e => setSaveForm({ ...saveForm, processo: e.target.value })} placeholder="Ex: PROC-001" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancelar</button>
                <button onClick={handleConfirmSave} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold shadow-lg shadow-orange-500/20 transition-all">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List Modal */}
      {showListModal && (
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
      )}

    </div>
  );
}

function ActionButton({ icon, label, onClick, color }) {
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
      <span className="text-sm text-slate-600">{desc}</span>
      <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 min-w-[2rem] text-center shadow-sm">
        {k}
      </kbd>
    </div>
  );
}

function ControlItem({ label, desc }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700 whitespace-nowrap flex-shrink-0">
        {label}
      </kbd>
      <span className="text-slate-600 text-[11px] leading-tight">{desc}</span>
    </div>
  );
}
