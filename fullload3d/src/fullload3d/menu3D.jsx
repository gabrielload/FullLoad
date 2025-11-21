// src/fullLoad3D/Menu3D.jsx
import React, { useEffect, useState } from "react";
import { db } from "../services/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

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
    const tipoMatch = filtroTipo === "todos" || m.tipo === filtroTipo;
    return nomeMatch && tipoMatch;
  });

  // Carregar baú
  const carregarNo3D = () => {
    if (!bauSelecionado) return;

    const L = bauSelecionado.tamanhoBau?.W / 100;
    const H = bauSelecionado.tamanhoBau?.H / 100;
    const W = bauSelecionado.tamanhoBau?.L / 100;

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

  // Limpar tudo no 3D
  const limpar3D = () =>
    window.dispatchEvent(new CustomEvent("3d_clear"));

  return (
    <aside className="w-72 bg-white shadow-lg h-full flex flex-col p-4 gap-6 rounded-2xl border-r">

      {/* ================= BAÚ ================= */}
      <div>
        <h2 className="text-lg font-semibold text-orange-600 mb-2">Baú</h2>

        <select
          className="w-full p-2 border rounded-lg text-sm"
          value={bauSelecionado?.id || ""}
          onChange={e => {
            const b = baus.find(x => x.id === e.target.value);
            setBauSelecionado(b);
            onSelectBau && onSelectBau(b);
          }}
        >
          <option value="">Selecione um baú...</option>
          {baus.map(b => (
            <option key={b.id} value={b.id}>
              {b.modelo} – {b.tamanhoBau?.L}×{b.tamanhoBau?.W}×{b.tamanhoBau?.H} cm
            </option>
          ))}
        </select>

        {bauSelecionado && (
          <button
            className="w-full mt-2 py-2 bg-orange-500 text-white rounded-lg text-sm"
            onClick={carregarNo3D}
          >
            Carregar no 3D
          </button>
        )}

        <button
          className="w-full mt-2 py-2 bg-red-500 text-white rounded-lg text-sm"
          onClick={limpar3D}
        >
          Limpar 3D
        </button>
      </div>

      {/* ================= PESQUISA ================= */}
      <div>
        <h2 className="text-lg font-semibold text-orange-600 mb-2">Mercadorias</h2>

        <input
          type="text"
          placeholder="Pesquisar nome/código..."
          className="w-full p-2 border rounded-lg mb-2 text-sm"
          value={pesquisa}
          onChange={e => setPesquisa(e.target.value)}
        />

        <select
          className="w-full p-2 border rounded-lg text-sm"
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
        >
          <option value="todos">Todos os tipos</option>
          <option value="caixa">Caixa</option>
          <option value="cilindrico">Cilíndrico</option>
          <option value="palete">Palete</option>
          <option value="sacola">Saco</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      {/* ================= LISTA ================= */}
      <div className="flex-1 overflow-y-auto pr-2">
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
            className={`border p-2 rounded-xl mb-2 cursor-pointer transition 
              ${mercadoriaSelecionada?.id === m.id
                ? "bg-yellow-300 border-yellow-600"
                : "hover:bg-orange-50"
              }`}
          >
            <div>
              <p className="font-medium">{m.nome}</p>
              <p className="text-xs text-gray-600">
                {m.comprimento}×{m.largura}×{m.altura} cm • {m.tipo}
              </p>
            </div>
            <span className="text-sm font-bold">{m.quantidade}</span>
          </div>
        ))}
      </div>

      {/* ================= QUANTIDADE ================= */}
      {mercadoriaSelecionada && (
        <div className="p-3 border rounded-xl bg-orange-50">
          <h3 className="font-semibold text-sm mb-1">Quantidade para colocar</h3>

          <input
            type="number"
            min="1"
            max={mercadoriaSelecionada.quantidade}
            value={quantidadeSelecionada}
            onChange={e => setQuantidadeSelecionada(e.target.value)}
            className="w-full p-2 mb-2 border rounded-lg text-sm"
          />

          <button
            className="w-full py-2 bg-orange-600 text-white rounded-lg text-sm font-medium"
            onClick={carregarMercadoriasNo3D}
          >
            Carregar automaticamente
          </button>
        </div>
      )}
    </aside>
  );
}
