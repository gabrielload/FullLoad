// src/pages/Mercadoria.jsx
import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import ClientLayout from "../layouts/ClientLayout";
import { db } from "../services/firebaseConfig";
import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc } from "firebase/firestore";
import Papa from "papaparse";
import {
  Edit,
  Trash2,
  FileText,
  Plus,
  Save,
  Package,
  Box,
  Circle,
  Loader2,
  CheckCircle,
  Search,
  LayoutGrid,
  List as ListIcon,
  X,
  Ruler,
  Scale
} from "lucide-react";

export default function Mercadoria() {
  const empresaId = localStorage.getItem("empresaId");

  // UI States
  const [mercadorias, setMercadorias] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  // Modal States
  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [deleteConfirmation, setDeleteConfirmation] = useState(null); // { id } or null

  // Import States
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [importStatus, setImportStatus] = useState("");

  const [form, setForm] = useState({
    nome: "",
    codigo: "",
    // quantidade removed
    tipo: "caixa",
    peso: 0,
    comprimento: 0,
    largura: 0,
    altura: 0,
    volume: 0,
    precoUnitario: 0,
    status: "ativo",
    posicao: "livre",
    posicao: "livre",
    cor: "#ff7a18",
    fragilidade: "baixa", // baixa, media, alta
    empilhavel: true,
    perigoso: false,
  });

  useEffect(() => {
    if (empresaId) carregarMercadorias();
  }, [empresaId]);

  const carregarMercadorias = async () => {
    try {
      setLoading(true);
      const mercadoriasRef = collection(db, "empresas", empresaId, "mercadorias");
      const snap = await getDocs(mercadoriasRef);
      setMercadorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar mercadorias:", err);
    } finally {
      setLoading(false);
    }
  };

  const getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const abrirModalCriar = () => {
    setEditItem(null);
    setForm({
      nome: "",
      codigo: "",
      // quantidade removed
      tipo: "caixa",
      peso: 0,
      comprimento: 0,
      largura: 0,
      altura: 0,
      volume: 0,
      precoUnitario: 0,
      status: "ativo",
      posicao: "livre",
      fragilidade: "baixa",
      empilhavel: true,
      perigoso: false,
    });
    setErrors({});
    setOpenModal(true);
  };
  // ... (lines 118-592 omitted for brevity as I need to target the modal render next) ...

  // I need to split this replace into two because the target lines are far apart (108 vs 600+).
  // But replace_file_content works on contiguous blocks.
  // I will fix the duplicate key first with a small edit, then do the large UI edit.


  const abrirModalEditar = (item) => {
    setEditItem(item);
    setForm({ ...item });
    setErrors({});
    setOpenModal(true);
  };

  const calcularVolume = (c, l, a) => ((c * l * a) / 1000000).toFixed(3);

  const handleChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    if (["comprimento", "largura", "altura"].includes(field)) {
      newForm.volume = Number(calcularVolume(newForm.comprimento, newForm.largura, newForm.altura));
    }
    setForm(newForm);
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.nome.trim()) newErrors.nome = "Nome é obrigatório";

    if (Number(form.peso) <= 0) newErrors.peso = "Peso deve ser maior que 0";
    if (Number(form.comprimento) <= 0) newErrors.comprimento = "Comprimento deve ser maior que 0";
    if (Number(form.largura) <= 0) newErrors.largura = "Largura deve ser maior que 0";
    if (Number(form.altura) <= 0) newErrors.altura = "Altura deve ser maior que 0";
    if (Number(form.precoUnitario) < 0) newErrors.precoUnitario = "Preço não pode ser negativo";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const salvarMercadoria = async () => {
    if (!validateForm()) return;

    // Check for duplicate color
    // const corExiste = mercadorias.some(m => m.cor.toLowerCase() === form.cor.toLowerCase() && m.id !== editItem?.id);
    // if (corExiste) {
    //   alert("Esta cor já está sendo usada por outra mercadoria. Por favor, escolha outra cor.");
    //   return;
    // }

    try {
      setLoading(true);
      const dadosParaSalvar = {
        ...form,
        quantidade: 1,
        peso: Number(form.peso),
        comprimento: Number(form.comprimento),
        largura: Number(form.largura),
        altura: Number(form.altura),
        volume: Number(form.volume),
        precoUnitario: Number(form.precoUnitario),
        status: form.status || "ativo",
        posicao: form.posicao || "livre",
        // cor: form.cor || "#ff7a18",
        fragilidade: form.fragilidade || "baixa",
        empilhavel: form.empilhavel !== undefined ? form.empilhavel : true,
        perigoso: form.perigoso || false,
      };
      const mercadoriasRef = collection(db, "empresas", empresaId, "mercadorias");
      if (editItem) {
        await updateDoc(doc(db, "empresas", empresaId, "mercadorias", editItem.id), dadosParaSalvar);
      } else {
        await addDoc(mercadoriasRef, dadosParaSalvar);
      }
      setOpenModal(false);
      carregarMercadorias();
      setMensagemSucesso("Mercadoria salva com sucesso!");
      setTimeout(() => setMensagemSucesso(""), 3000);
    } catch (err) {
      console.error("Erro ao salvar mercadoria:", err);
      alert("Erro ao salvar mercadoria. Veja console.");
    } finally {
      setLoading(false);
    }
  };

  const excluirMercadoria = (id) => {
    setDeleteConfirmation({ id });
  };

  const confirmarExclusao = async () => {
    if (!deleteConfirmation) return;
    const { id } = deleteConfirmation;
    try {
      setLoading(true);
      await deleteDoc(doc(db, "empresas", empresaId, "mercadorias", id));
      carregarMercadorias();
      setDeleteConfirmation(null);
    } catch (err) {
      console.error("Erro ao excluir mercadoria:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = (file) => {
    if (!file) return;
    setCsvFile(file);
    Papa.parse(file, { header: true, skipEmptyLines: true, preview: 5, complete: (results) => setCsvPreview(results.data) });
  };

  const importarCSV = async () => {
    if (!csvFile) return alert("Selecione um arquivo CSV!");
    setImportStatus("Processando...");

    // Helper to normalize keys
    const normalizeKey = (key) => {
      const k = key.toLowerCase().trim();
      if (k === "nome" || k === "name" || k === "produto") return "nome";
      if (k === "codigo" || k === "code" || k === "sku" || k === "ref") return "codigo";
      if (k.includes("qtd") || k.includes("quant") || k === "qty") return "quantidade";
      if (k === "peso" || k === "weight" || k === "kg") return "peso";
      // Dimensions
      if (k === "comprimento" || k === "comp" || k === "length" || k === "c" || k === "l") return "comprimento"; // careful with 'l' vs largura
      if (k === "largura" || k === "larg" || k === "width" || k === "w") return "largura";
      if (k === "altura" || k === "alt" || k === "height" || k === "h" || k === "a") return "altura";

      return k; // fallback
    };

    // Helper to normalize types
    const normalizeType = (t) => {
      if (!t) return "caixa";
      const val = t.toLowerCase().trim();
      if (val === "cilindro" || val === "cylinder" || val === "tubo") return "cilindrico";
      if (val === "caixa" || val === "box" || val === "cube") return "caixa";
      if (val === "palete" || val === "pallet") return "palete";
      if (val === "pneu" || val === "tire") return "pneu";
      return "caixa"; // default fallback
    };

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: normalizeKey, // Normalize headers automatically!
      complete: async (results) => {
        try {
          const mercadoriasRef = collection(db, "empresas", empresaId, "mercadorias");
          let count = 0;
          let errors = 0;

          for (const row of results.data) {
            // Basic Validation
            if (!row.nome && !row.codigo) {
              console.warn("Skipping empty row:", row);
              continue;
            }

            // Normalization & Defaults
            const comprimento = Number(row.comprimento || 0);
            const largura = Number(row.largura || 0);
            const altura = Number(row.altura || 0);
            const volume = Number(row.volume) || Number(calcularVolume(comprimento, largura, altura)) || 0;

            const dados = {
              nome: row.nome || row.codigo || "Item Importado",
              codigo: row.codigo || "",
              quantidade: Number(row.quantidade) || 1,
              tipo: normalizeType(row.tipo), // Use helper 
              peso: Number(row.peso) || 0,
              comprimento,
              largura,
              altura,
              volume,
              precoUnitario: Number(row.precoUnitario) || 0,
              status: "ativo",
              posicao: (row.posicao || "livre").toLowerCase(),
              // cor: row.cor || getRandomColor(),
              fragilidade: (row.fragilidade || "baixa").toLowerCase(),
              empilhavel: String(row.empilhavel).toLowerCase() === "true" || String(row.empilhavel) === "1" || false,
              perigoso: String(row.perigoso).toLowerCase() === "true" || String(row.perigoso) === "1" || false,
              dataCriacao: new Date().toISOString()
            };

            await addDoc(mercadoriasRef, dados);
            count++;
          }

          setImportStatus(`Importação concluída! ${count} itens importados.`);
          setCsvFile(null);
          setCsvPreview([]);
          setOpenImportModal(false);
          carregarMercadorias();
        } catch (err) {
          console.error(err);
          setImportStatus("Erro durante a importação.");
        }
      },
    });
  };

  const listaFiltrada = useMemo(() => {
    return mercadorias.filter((m) =>
      (m.nome && m.nome.toLowerCase().includes(filtro.toLowerCase())) ||
      (m.codigo && m.codigo.toLowerCase().includes(filtro.toLowerCase()))
    );
  }, [filtro, mercadorias]);

  const TipoBadge = ({ tipo }) => {
    const config = {
      caixa: { icon: Box, color: "bg-blue-100 text-blue-700 border-blue-200" },
      cilindrico: { icon: Circle, color: "bg-purple-100 text-purple-700 border-purple-200" },
      palete: { icon: Package, color: "bg-green-100 text-green-700 border-green-200" },
      pneu: { icon: Circle, color: "bg-gray-800 text-white border-gray-700" },
    };
    const { icon: Icon, color } = config[tipo] || config.caixa;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${color}`}>
        <Icon className="w-3 h-3" />
        {tipo}
      </span>
    );
  };

  const MetricCard = ({ icon: Icon, title, value, gradient, iconBg }) => (
    <div className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${iconBg} transform group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={24} />
        </div>
      </div>
      {/* Decorative gradient blob */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-xl" style={{ background: gradient }}></div>
    </div>
  );

  return (
    <ClientLayout>
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Package className="w-8 h-8 text-orange-500" />
              Mercadorias
            </h1>
            <p className="text-slate-500 mt-1">Gerencie seu catálogo de produtos e embalagens.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpenImportModal(true)}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <FileText size={18} />
              Importar CSV
            </button>
            <button
              onClick={abrirModalCriar}
              className="px-4 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 flex items-center gap-2"
            >
              <Plus size={18} />
              Nova Mercadoria
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            icon={Package}
            title="Total de Itens"
            value={mercadorias.length}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            iconBg="bg-indigo-500"
          />
          <MetricCard
            icon={Box}
            title="Volume Total"
            value={`${mercadorias.reduce((acc, m) => acc + (Number(m.volume || 0) * Number(m.quantidade || 1)), 0).toFixed(2)} m³`}
            gradient="linear-gradient(135deg, #f6d365 0%, #fda085 100%)"
            iconBg="bg-orange-500"
          />
          <MetricCard
            icon={Scale}
            title="Peso Total"
            value={`${mercadorias.reduce((acc, m) => acc + (Number(m.peso || 0) * Number(m.quantidade || 1)), 0).toFixed(0)} kg`}
            gradient="linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)"
            iconBg="bg-emerald-500"
          />
        </div>

        {/* Controls & Search */}
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-lg border border-white/20 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-4 z-30">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={20} />
            <input
              type="text"
              placeholder="Buscar mercadoria..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-slate-700"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2.5 rounded-lg transition-all duration-300 ${viewMode === "grid" ? "bg-white text-orange-600 shadow-md transform scale-105" : "text-slate-400 hover:text-slate-600"}`}
              title="Visualização em Grade"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 rounded-lg transition-all duration-300 ${viewMode === "list" ? "bg-white text-orange-600 shadow-md transform scale-105" : "text-slate-400 hover:text-slate-600"}`}
              title="Visualização em Lista"
            >
              <ListIcon size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-pulse">
            <Loader2 size={48} className="animate-spin mb-4 text-orange-500" />
            <p>Carregando mercadorias...</p>
          </div>
        ) : listaFiltrada.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Package size={40} className="opacity-50" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Nenhuma mercadoria encontrada</h3>
            <p className="max-w-xs text-center mt-2 mb-6">Comece adicionando itens manualmente ou importe uma lista CSV.</p>
            <button
              onClick={abrirModalCriar}
              className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
            >
              Adicionar Primeira Mercadoria
            </button>
          </div>
        ) : (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {listaFiltrada.map((item) => (
                  <div key={item.id} className="group relative bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    {/* Actions (Floating) */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button onClick={() => abrirModalEditar(item)} className="p-2 bg-white text-orange-600 rounded-xl hover:bg-orange-50 shadow-sm border border-slate-100 transition-colors" title="Editar">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => excluirMercadoria(item.id)} className="p-2 bg-white text-red-500 rounded-xl hover:bg-red-50 shadow-sm border border-slate-100 transition-colors" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Header */}
                    <div className="mb-6">
                      <div className="flex items-center gap-3 mb-2">
                        <TipoBadge tipo={item.tipo || "caixa"} />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1 truncate pr-16">{item.nome}</h3>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-xs font-mono font-medium text-slate-500">
                        #{item.codigo || "N/A"}
                      </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {/* Dims */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <Ruler size={14} />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Dimensões</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-700">
                          {item.comprimento}x{item.largura}x{item.altura} <span className="text-slate-400 font-normal">cm</span>
                        </div>
                      </div>

                      {/* Weight */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <Scale size={14} />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Peso</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-700">
                          {item.peso} <span className="text-slate-400 font-normal">kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Badges / Extras */}
                    <div className="flex flex-wrap gap-2">
                      {item.fragilidade !== "baixa" && (
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${item.fragilidade === "alta" ? "bg-red-50 text-red-600 border-red-100" : "bg-yellow-50 text-yellow-600 border-yellow-100"}`}>
                          Fragilidade: {item.fragilidade}
                        </span>
                      )}
                      {!item.empilhavel && (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          Não Empilha
                        </span>
                      )}
                    </div>



                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Dimensões (cm)</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Peso (kg)</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {listaFiltrada.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                {item.nome[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{item.nome}</p>
                                <p className="text-xs text-slate-400 font-mono">#{item.codigo || "S/COD"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                            {item.comprimento} x {item.largura} x {item.altura}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                            {item.peso}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => abrirModalEditar(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => excluirMercadoria(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}


        {/* Modal Criar/Editar */}
        {openModal && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setOpenModal(false)} />

            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl transform transition-all animate-fade-in-up overflow-hidden flex flex-col max-h-[80vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  {editItem ? <Edit className="w-5 h-5 text-orange-500" /> : <Plus className="w-5 h-5 text-orange-500" />}
                  {editItem ? "Editar Mercadoria" : "Nova Mercadoria"}
                </h2>
                <button onClick={() => setOpenModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">

                  {/* Row 1: Identification */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nome do Item*</label>
                      <input
                        type="text"
                        className={`w-full px-3 py-2 rounded-lg border ${errors.nome ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-semibold text-slate-700 text-sm`}
                        placeholder="Ex: Caixa de Sapatos"
                        value={form.nome}
                        onChange={(e) => handleChange("nome", e.target.value)}
                      />
                      {errors.nome && <p className="text-red-500 text-[10px] mt-0.5">{errors.nome}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Código</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-semibold text-slate-700 text-sm"
                        placeholder="Ex: CX-001"
                        value={form.codigo}
                        onChange={(e) => handleChange("codigo", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-4">
                    {/* Col 1: Dimensions (Tall) */}
                    <div className="col-span-12 md:col-span-7">
                      <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 h-full">
                        <h3 className="text-[10px] font-bold text-slate-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
                          <Box size={14} className="text-orange-500" /> Dimensões e Peso
                        </h3>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Comprimento (cm)*</label>
                            <input
                              type="number"
                              className={`w-full px-3 py-2 rounded-lg border ${errors.comprimento ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 font-bold text-sm`}
                              placeholder="0"
                              value={form.comprimento}
                              onChange={(e) => handleChange("comprimento", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Largura (cm)*</label>
                            <input
                              type="number"
                              className={`w-full px-3 py-2 rounded-lg border ${errors.largura ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 font-bold text-sm`}
                              placeholder="0"
                              value={form.largura}
                              onChange={(e) => handleChange("largura", e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Altura (cm)*</label>
                            <input
                              type="number"
                              className={`w-full px-3 py-2 rounded-lg border ${errors.altura ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 font-bold text-sm`}
                              placeholder="0"
                              value={form.altura}
                              onChange={(e) => handleChange("altura", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Peso (kg)*</label>
                            <input
                              type="number"
                              className={`w-full px-3 py-2 rounded-lg border ${errors.peso ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 font-bold text-sm`}
                              placeholder="0"
                              value={form.peso}
                              onChange={(e) => handleChange("peso", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Properties */}
                    <div className="col-span-12 md:col-span-5 flex flex-col gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo de Embalagem</label>
                        <select className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-semibold text-slate-700 text-sm" value={form.tipo} onChange={(e) => handleChange("tipo", e.target.value)}>
                          <option value="caixa">Caixa</option>
                          <option value="cilindrico">Cilindro</option>
                          <option value="palete">Palete</option>
                          <option value="pneu">Pneu</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fragilidade</label>
                          <select className="w-full px-2 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-semibold text-slate-700 text-xs" value={form.fragilidade} onChange={(e) => handleChange("fragilidade", e.target.value)}>
                            <option value="baixa">Baixa</option>
                            <option value="media">Média</option>
                            <option value="alta">Alta</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Posição</label>
                          <select className="w-full px-2 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-semibold text-slate-700 text-xs" value={form.posicao} onChange={(e) => handleChange("posicao", e.target.value)}>
                            <option value="livre">Livre</option>
                            <option value="em_pe">Em pé</option>
                            <option value="deitado">Deitado</option>
                            <option value="de_lado">De lado</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={form.empilhavel}
                            onChange={(e) => handleChange("empilhavel", e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-xs font-bold text-slate-600">Empilhável</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer bg-red-50/50 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={form.perigoso}
                            onChange={(e) => handleChange("perigoso", e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-xs font-bold text-slate-600">Material Perigoso</span>
                        </label>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Volume Estimado</span>
                  <span className="text-slate-800 font-bold text-sm leading-none">{form.volume || 0} m³</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setOpenModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-white hover:border-slate-300 transition-all text-xs uppercase tracking-wide">Cancelar</button>
                  <button onClick={salvarMercadoria} disabled={loading} className="px-5 py-2 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-lg shadow-orange-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-all text-xs uppercase tracking-wide">
                    {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                    {editItem ? "Salvar" : "Adicionar"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Import Modal */}
        {openImportModal && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpenImportModal(false)} />
            <div className="relative w-full max-w-7xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold text-slate-900">Importar CSV</h2>
                <button onClick={() => setOpenImportModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                {!csvFile ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:border-orange-400 hover:bg-orange-50/30 transition-all group relative">
                    <input type="file" accept=".csv" onChange={(e) => handleCSVUpload(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <FileText className="w-12 h-12 text-slate-300 group-hover:text-orange-500 mx-auto mb-4 transition-colors" />
                    <h3 className="text-lg font-bold text-slate-700 group-hover:text-orange-700">Arraste seu CSV aqui</h3>
                    <p className="text-slate-400 mt-2">ou clique para selecionar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{csvFile.name}</p>
                          <p className="text-xs text-slate-500">{(csvFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <button onClick={() => { setCsvFile(null); setCsvPreview([]); }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={18} /></button>
                    </div>

                    {csvPreview.length > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-slate-50">
                            <tr>
                              {Object.keys(csvPreview[0]).map((k) => <th key={k} className="p-3 font-semibold text-slate-600">{k}</th>)}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {csvPreview.slice(0, 5).map((row, i) => (
                              <tr key={i}>
                                {Object.values(row).map((v, j) => <td key={j} className="p-3 text-slate-600">{v}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button onClick={() => setOpenImportModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-white">Cancelar</button>
                <button onClick={importarCSV} disabled={!csvFile} className="px-5 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 disabled:opacity-50 shadow-lg shadow-orange-500/20">Confirmar Importação</button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Excluir Mercadoria?</h3>
              <p className="text-slate-500 mb-6">
                Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
              </p>
              <div className="flex items-center gap-3 justify-center">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarExclusao}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                  <span>Excluir</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </ClientLayout>
  );
}

