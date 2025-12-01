// src/fullLoad3D/Menu3D.jsx
import React, { useEffect, useState } from "react";
import { db } from "../services/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";
import { Package, Truck, Search, Trash2, Box, ArrowRight } from "lucide-react"; // Assuming lucide-react is available or we use text icons if not

export default function Menu3D({ onSelectBau, onSelectMercadoria }) {
  const empresaId = typeof window !== "undefined"
    ? localStorage.getItem("empresaId")
    : null;

  const [baus, setBaus] = useState([]);
  const [mercadorias, setMercadorias] = useState([]);
  const [mercadoriaSelecionada, setMercadoriaSelecionada] = useState(null);
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState(1);

  const [pesquisa, setPesquisa] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [bauSelecionado, setBauSelecionado] = useState(null);

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

  // Helper para obter dimensões do baú (suporta chaves em PT e EN)
  const getDimensions = (bau) => {
    if (!bau) return { L: 0, H: 0, W: 0 };
    const t = bau.tamanhoBau || bau;
    return {
      L: Number(t.L || t.comprimento || 0),
      H: Number(t.H || t.altura || 0),
      W: Number(t.W || t.largura || 0)
    };
  };

  // Carregar baú
  const carregarNo3D = () => {
    if (!bauSelecionado) return;

    const { L, H, W } = getDimensions(bauSelecionado);

    window.dispatchEvent(
      new CustomEvent("3d_setBau", {
        detail: { L, H, W, id: bauSelecionado.id }
      })
    );
  };

  // Carregar mercadoria automaticamente
  const carregarMercadoriasNo3D = () => {
    if (!mercadoriaSelecionada || !quantidadeSelecionada) return;

    // Envia pré-visualização para o 3D
    window.dispatchEvent(
      new CustomEvent("3d_setGhost", { detail: mercadoriaSelecionada })
    );

    // Auto-placement
    window.dispatchEvent(
      new CustomEvent("3d_addMercadoria", {
        detail: {
          mercadoria: mercadoriaSelecionada,
          quantidade: Number(quantidadeSelecionada)
        }
      })
    );
  };

  // Limpar tudo no 3Ds
  const limpar3D = () =>
    window.dispatchEvent(new CustomEvent("3d_clear"));

  return (
    <aside className="w-80 bg-white shadow-2xl h-full flex flex-col rounded-r-3xl border-r border-gray-100 z-20 font-sans">

      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
          <span className="text-orange-600">Full</span>Load 3D
        </h1>
        <p className="text-xs text-gray-500 mt-1">Planejamento de Carga Inteligente</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">

        {/* ================= BAÚ ================= */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-orange-600" />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Configuração do Baú</h2>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Selecione o Veículo</label>
            <select
              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
              value={bauSelecionado?.id || ""}
              onChange={e => {
                const b = baus.find(x => x.id === e.target.value);
                setBauSelecionado(b);
                onSelectBau && onSelectBau(b);
              }}
            >
              <option value="">Escolha um modelo...</option>
              {baus.map(b => (
                <option key={b.id} value={b.id}>
                  {b.modelo} ({b.tamanhoBau?.L}×{b.tamanhoBau?.W}×{b.tamanhoBau?.H})
                </option>
              ))}
            </select>

            <div className="flex gap-2 mt-3">
              {bauSelecionado && (
                <button
                  className="flex-1 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-gray-900/20"
                  onClick={carregarNo3D}
                >
                  Carregar Baú
                </button>
              )}
              <button
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors"
                onClick={limpar3D}
                title="Limpar Cena"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ================= MERCADORIAS ================= */}
        <section className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-orange-600" />
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Mercadorias</h2>
          </div>

          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar item..."
                className="w-full pl-9 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                value={pesquisa}
                onChange={e => setPesquisa(e.target.value)}
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {["todos", "caixa", "cilindrico", "palete"].map(type => (
                <button
                  key={type}
                  onClick={() => setFiltroTipo(type)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${filtroTipo === type
                    ? "bg-orange-100 text-orange-700 border-orange-200"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[300px]">
            {mercadoriasFiltradas.map(m => (
              <div
                key={m.id}
                onClick={() => {
                  setMercadoriaSelecionada(m);
                  setQuantidadeSelecionada(1);
                  window.dispatchEvent(
                    new CustomEvent("3d_setGhost", { detail: m })
                  );
                  onSelectMercadoria && onSelectMercadoria(m);
                }}
                className={`group p-3 rounded-xl border cursor-pointer transition-all duration-200 relative overflow-hidden ${mercadoriaSelecionada?.id === m.id
                  ? "bg-orange-50 border-orange-200 shadow-sm ring-1 ring-orange-200"
                  : "bg-white border-gray-100 hover:border-orange-200 hover:shadow-sm"
                  }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-semibold text-sm ${mercadoriaSelecionada?.id === m.id ? "text-orange-900" : "text-gray-800"}`}>
                      {m.nome}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Box className="w-3 h-3" />
                      {m.comprimento}×{m.largura}×{m.altura} cm
                    </p>
                  </div>
                  <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-md">
                    Qtd: {m.quantidade}
                  </span>
                </div>

                {/* Selection Indicator */}
                {mercadoriaSelecionada?.id === m.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ================= FOOTER ACTION ================= */}
      {mercadoriaSelecionada && (
        <div className="p-4 border-t border-gray-100 bg-white/80 backdrop-blur-sm absolute bottom-0 left-0 right-0 rounded-br-3xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <Box className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 truncate">Selecionado</p>
              <p className="text-sm font-bold text-gray-900 truncate">{mercadoriaSelecionada.nome}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="w-20">
              <input
                type="number"
                min="1"
                max={mercadoriaSelecionada.quantidade}
                value={quantidadeSelecionada}
                onChange={e => setQuantidadeSelecionada(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-center font-semibold text-gray-700 focus:ring-2 focus:ring-orange-500/20 outline-none"
              />
            </div>
            <button
              className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2"
              onClick={carregarMercadoriasNo3D}
            >
              Adicionar
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
