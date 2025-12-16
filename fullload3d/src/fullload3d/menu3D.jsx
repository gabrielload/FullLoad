import React, { useEffect, useState } from "react";
import { db } from "../services/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";
import {
  Package, Truck, Search, Trash2, Box, ArrowRight,
  ChevronLeft, ChevronRight, Settings, BarChart3, LayoutGrid, Calendar, FileText, Download
} from "lucide-react";
import { query, where, getDocs, orderBy } from "firebase/firestore";

export default function Menu3D({ onSelectBau, onSelectMercadoria }) {
  const empresaId = typeof window !== "undefined"
    ? localStorage.getItem("empresaId")
    : null;

  const [baus, setBaus] = useState([]);
  const [mercadorias, setMercadorias] = useState([]);
  const [mercadoriaSelecionada, setMercadoriaSelecionada] = useState(null);
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastSelectedId, setLastSelectedId] = useState(null);

  const [pesquisa, setPesquisa] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [bauSelecionado, setBauSelecionado] = useState(null);
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("mercadorias");

  // Firestore listeners
  useEffect(() => {
    if (!empresaId) return;

    const unsub1 = onSnapshot(
      collection(db, "empresas", empresaId, "caminhoes"),
      snap =>
        setBaus(
          snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(b => b.modelo)
        )
    );

    const unsub2 = onSnapshot(
      collection(db, "empresas", empresaId, "mercadorias"),
      snap => setMercadorias(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [empresaId]);

  const mercadoriasFiltradas = mercadorias.filter(m => {
    const nomeMatch =
      m.nome.toLowerCase().includes(pesquisa.toLowerCase()) ||
      m.codigo?.toLowerCase().includes(pesquisa.toLowerCase());

    if (filtroTipo === "todos") return nomeMatch;

    const tipoItem = (m.tipo || "").toLowerCase();
    const tipoFiltro = filtroTipo.toLowerCase();

    return nomeMatch && tipoItem === tipoFiltro;
  });

  const getDimensions = (bau) => {
    if (!bau) return { L: 0, H: 0, W: 0 };
    const t = bau.tamanhoBau || bau;
    return {
      L: Number(t.L || t.comprimento || 0),
      H: Number(t.H || t.altura || 0),
      W: Number(t.W || t.largura || 0)
    };
  };

  const carregarNo3D = () => {
    if (!bauSelecionado) return;
    const { L, H, W } = getDimensions(bauSelecionado);
    window.dispatchEvent(
      new CustomEvent("3d_setBau", {
        detail: { L, H, W, id: bauSelecionado.id }
      })
    );
  };

  const toggleSelection = (item, multi) => {
    const newSet = new Set(multi ? selectedIds : []);
    if (newSet.has(item.id)) {
      newSet.delete(item.id);
    } else {
      newSet.add(item.id);
    }
    setSelectedIds(newSet);
    setLastSelectedId(item.id);

    if (newSet.size === 1) {
      const id = Array.from(newSet)[0];
      setMercadoriaSelecionada(mercadorias.find(m => m.id === id));
    } else {
      setMercadoriaSelecionada(null);
    }
  };

  const handleCardClick = (e, item) => {
    const isMulti = e.ctrlKey || e.metaKey || e.shiftKey;
    toggleSelection(item, isMulti);

    if (!isMulti) {
      setQuantidadeSelecionada(1);
      window.dispatchEvent(new CustomEvent("3d_setGhost", { detail: item }));
      onSelectMercadoria && onSelectMercadoria(item);
    }
  };

  const addSelectedTo3D = () => {
    const itemsToAdd = [];
    if (selectedIds.size > 0) {
      selectedIds.forEach(id => {
        const item = mercadorias.find(m => m.id === id);
        if (item) itemsToAdd.push(item);
      });
    } else if (mercadoriaSelecionada) {
      itemsToAdd.push(mercadoriaSelecionada);
    }

    itemsToAdd.forEach(item => {
      window.dispatchEvent(
        new CustomEvent("3d_addMercadoria", {
          detail: {
            mercadoria: item,
            quantidade: Number(quantidadeSelecionada)
          }
        })
      );
    });
  };

  const limpar3D = () =>
    window.dispatchEvent(new CustomEvent("3d_clear"));

  return (
    <aside className={`${isOpen ? "w-[380px]" : "w-[72px]"} bg-[#0f172a] shadow-2xl h-full flex transition-all duration-300 z-20 font-sans border-r border-slate-800`}>

      {/* SIDEBAR NAVIGATION (ICONS) */}
      <div className="w-[72px] flex flex-col items-center py-6 gap-4 border-r border-slate-800 bg-[#020617]">
        <div className="mb-4">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
            <LayoutGrid className="w-6 h-6 text-white" />
          </div>
        </div>

        <NavButton
          active={activeTab === "bau"}
          onClick={() => { setActiveTab("bau"); if (!isOpen) setIsOpen(true); }}
          icon={<Truck className="w-5 h-5" />}
          label="Baú"
        />

        <NavButton
          active={activeTab === "mercadorias"}
          onClick={() => { setActiveTab("mercadorias"); if (!isOpen) setIsOpen(true); }}
          icon={<Package className="w-5 h-5" />}
          label="Itens"
        />

        <div className="mt-auto flex flex-col gap-4 items-center w-full pb-4">
          <NavButton
            active={activeTab === "config"}
            onClick={() => { setActiveTab("config"); if (!isOpen) setIsOpen(true); }}
            icon={<Settings className="w-5 h-5" />}
            label="Config"
          />

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            title={isOpen ? "Recolher Menu" : "Expandir Menu"}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className={`flex-1 flex flex-col min-w-0 bg-[#0f172a] ${!isOpen && "hidden"}`}>

        {/* HEADER */}
        <div className="h-20 px-6 border-b border-slate-800 flex justify-between items-center bg-[#0f172a]">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              FullLoad <span className="text-orange-500">3D</span>
            </h1>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Planejamento</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">

          {/* --- TAB: BAÚ --- */}
          {activeTab === "bau" && (
            <div className="space-y-6 animate-fade-in">
              <SectionHeader icon={<Truck className="w-4 h-4" />} title="Configuração do Veículo" />

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
                <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">Modelo do Veículo</label>
                <select
                  className="w-full p-3.5 bg-[#020617] border border-slate-700 rounded-xl text-sm text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all appearance-none"
                  value={bauSelecionado?.id || ""}
                  onChange={e => {
                    const b = baus.find(x => x.id === e.target.value);
                    setBauSelecionado(b);
                    onSelectBau && onSelectBau(b);
                  }}
                >
                  <option value="">Selecione um modelo...</option>
                  {baus.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.modelo} ({b.tamanhoBau?.L}×{b.tamanhoBau?.W}×{b.tamanhoBau?.H})
                    </option>
                  ))}
                </select>

                <div className="flex flex-col gap-3 mt-5">
                  {bauSelecionado && (
                    <button
                      className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98]"
                      onClick={carregarNo3D}
                    >
                      Carregar Veículo
                    </button>
                  )}
                  <button
                    className="w-full py-3 bg-slate-800 hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                    onClick={limpar3D}
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpar Cena
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- TAB: MERCADORIAS --- */}
          {activeTab === "mercadorias" && (
            <div className="flex flex-col h-full animate-fade-in">
              <SectionHeader icon={<Package className="w-4 h-4" />} title="Catálogo de Itens" />

              {/* Search */}
              <div className="relative mb-5 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou código..."
                  className="w-full pl-10 p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all shadow-sm"
                  value={pesquisa}
                  onChange={e => setPesquisa(e.target.value)}
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
                {["todos", "caixa", "cilindrico", "palete"].map(type => (
                  <button
                    key={type}
                    onClick={() => setFiltroTipo(type)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${filtroTipo === type
                      ? "bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                      }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {mercadoriasFiltradas.map(m => {
                  const isSelected = selectedIds.has(m.id) || mercadoriaSelecionada?.id === m.id;
                  return (
                    <div
                      key={m.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/json", JSON.stringify(m));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={(e) => handleCardClick(e, m)}
                      className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200 relative overflow-hidden ${isSelected
                        ? "bg-slate-800 border-orange-500 shadow-lg shadow-orange-500/10"
                        : "bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700"
                        }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-3">
                          <h3 className={`font-semibold text-sm truncate ${isSelected ? "text-orange-400" : "text-slate-200"}`}>
                            {m.nome}
                          </h3>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-slate-500 flex items-center gap-1.5 bg-slate-950/50 px-2 py-1 rounded-md border border-slate-800/50">
                              <Box className="w-3 h-3" />
                              {m.comprimento}×{m.largura}×{m.altura}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{m.tipo || 'CX'}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${isSelected ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-slate-950 text-slate-500 border-slate-800"}`}>
                          Qtd: {m.quantidade}
                        </span>
                      </div>

                      {/* Active Indicator Bar */}
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* --- TAB: CONFIG --- */}
          {activeTab === "config" && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 animate-fade-in">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                <Settings className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-sm font-medium">Configurações em breve</p>
            </div>
          )}

        </div>

        {/* FOOTER ACTION (Only for Mercadorias) */}
        {activeTab === "mercadorias" && (selectedIds.size > 0 || mercadoriaSelecionada) && (
          <div className="p-5 border-t border-slate-800 bg-[#0f172a] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] z-30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                <Box className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {selectedIds.size > 1 ? `${selectedIds.size} SELECIONADOS` : "ITEM SELECIONADO"}
                </p>
                <p className="text-sm font-bold text-white truncate">
                  {selectedIds.size > 1 ? "Múltiplos Itens" : (mercadoriaSelecionada?.nome || "Item")}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-24">
                <input
                  type="number"
                  min="1"
                  value={quantidadeSelecionada}
                  onChange={e => setQuantidadeSelecionada(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-center font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  title="Quantidade"
                />
              </div>
              <button
                className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                onClick={addSelectedTo3D}
              >
                Adicionar {selectedIds.size > 1 ? "Todos" : ""}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-3 font-medium">
              <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">CTRL</span> + Clique para selecionar vários
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

// Subcomponents for cleaner code
function NavButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 group ${active
        ? "bg-slate-800 text-orange-500 shadow-inner"
        : "text-slate-500 hover:text-slate-200 hover:bg-slate-900"
        }`}
    >
      {icon}
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-r-full" />}
    </button>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 bg-slate-800 rounded-lg text-orange-500">
        {icon}
      </div>
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</h2>
    </div>
  );
}
