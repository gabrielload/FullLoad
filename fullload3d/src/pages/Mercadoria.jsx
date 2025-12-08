// src/pages/Mercadoria.jsx
import React, { useState, useEffect, useMemo } from "react";
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
      posicao: "livre",
      cor: getRandomColor(),
      fragilidade: "baixa",
      empilhavel: true,
      perigoso: false,
    });
    setErrors({});
    setOpenModal(true);
  };

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
    if (Number(form.quantidade) <= 0 || !Number.isInteger(Number(form.quantidade))) newErrors.quantidade = "Quantidade deve ser um inteiro maior que 0";
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
    const corExiste = mercadorias.some(m => m.cor.toLowerCase() === form.cor.toLowerCase() && m.id !== editItem?.id);
    if (corExiste) {
      alert("Esta cor já está sendo usada por outra mercadoria. Por favor, escolha outra cor.");
      return;
    }

    try {
      setLoading(true);
      const dadosParaSalvar = {
        ...form,
        quantidade: Number(form.quantidade),
        peso: Number(form.peso),
        comprimento: Number(form.comprimento),
        largura: Number(form.largura),
        altura: Number(form.altura),
        volume: Number(form.volume),
        precoUnitario: Number(form.precoUnitario),
        posicao: form.posicao || "livre",
        posicao: form.posicao || "livre",
        cor: form.cor || "#ff7a18",
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

  const excluirMercadoria = async (id) => {
    if (!confirm("Deseja realmente excluir esta mercadoria?")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, "empresas", empresaId, "mercadorias", id));
      carregarMercadorias();
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
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const mercadoriasRef = collection(db, "empresas", empresaId, "mercadorias");
          for (const row of results.data) {
            const dados = {
              nome: row.nome || "Sem nome",
              codigo: row.codigo || "",
              quantidade: Number(row.quantidade) || 1,
              tipo: row.tipo || "caixa",
              peso: Number(row.peso) || 0,
              comprimento: Number(row.comprimento) || 0,
              largura: Number(row.largura) || 0,
              altura: Number(row.altura) || 0,
              volume: Number(calcularVolume(Number(row.comprimento), Number(row.largura), Number(row.altura))),
              precoUnitario: Number(row.precoUnitario) || 0,
              status: row.status || "ativo",
              posicao: row.posicao || "livre",
              posicao: row.posicao || "livre",
              cor: row.cor || "#ff7a18",
              fragilidade: row.fragilidade || "baixa",
              empilhavel: row.empilhavel === "true" || row.empilhavel === true,
              perigoso: row.perigoso === "true" || row.perigoso === true,
            };
            await addDoc(mercadoriasRef, dados);
          }
          setImportStatus("Importação concluída!");
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
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 group">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500" style={{ background: gradient }}></div>
      <div className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${iconBg}`}>
            <Icon size={24} />
          </div>
        </div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">{title}</h3>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
      </div>
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
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, código ou tipo..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              title="Visualização em Grade"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white text-orange-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
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
                  <div key={item.id} className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative">
                    <div className="h-2 bg-gradient-to-r from-orange-400 to-orange-600" style={{ backgroundColor: item.cor }}></div>

                    <div className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 font-bold text-xl shadow-inner" style={{ color: item.cor }}>
                          {item.nome[0].toUpperCase()}
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => abrirModalEditar(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => excluirMercadoria(item.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-800 text-lg mb-1 truncate" title={item.nome}>{item.nome}</h3>
                      <p className="text-xs text-slate-400 font-mono mb-4 bg-slate-50 w-fit px-2 py-1 rounded border border-slate-100">#{item.codigo || "S/COD"}</p>

                      <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                          <Ruler size={14} className="text-slate-400" />
                          <span>{item.comprimento}x{item.largura}x{item.altura}cm</span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                          <Scale size={14} className="text-slate-400" />
                          <span>{item.peso}kg</span>
                        </div>
                      </div>
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
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Cor</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {listaFiltrada.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-600" style={{ color: item.cor }}>
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
                          <td className="px-6 py-4">
                            <div className="w-6 h-6 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: item.cor }}></div>
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
        {openModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setOpenModal(false)} />

            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl transform transition-all animate-fade-in-up overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  {editItem ? <Edit className="w-5 h-5 text-orange-500" /> : <Plus className="w-5 h-5 text-orange-500" />}
                  {editItem ? "Editar Mercadoria" : "Nova Mercadoria"}
                </h2>
                <button onClick={() => setOpenModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Item*</label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-xl border ${errors.nome ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900`}
                      placeholder="Ex: Caixa de Sapatos"
                      value={form.nome}
                      onChange={(e) => handleChange("nome", e.target.value)}
                    />
                    {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Código</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                        placeholder="Ex: CX-001"
                        value={form.codigo}
                        onChange={(e) => handleChange("codigo", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Quantidade*</label>
                      <input
                        type="number"
                        className={`w-full px-4 py-3 rounded-xl border ${errors.quantidade ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900`}
                        placeholder="1"
                        value={form.quantidade}
                        onChange={(e) => handleChange("quantidade", e.target.value)}
                      />
                      {errors.quantidade && <p className="text-red-500 text-xs mt-1">{errors.quantidade}</p>}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Box size={14} className="text-orange-500" /> Dimensões e Peso
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Comp. (cm)*</label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 rounded-lg border ${errors.comprimento ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 font-bold`}
                          placeholder="0"
                          value={form.comprimento}
                          onChange={(e) => handleChange("comprimento", e.target.value)}
                        />
                        {errors.comprimento && <p className="text-red-500 text-xs mt-1">{errors.comprimento}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Larg. (cm)*</label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 rounded-lg border ${errors.largura ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 font-bold`}
                          placeholder="0"
                          value={form.largura}
                          onChange={(e) => handleChange("largura", e.target.value)}
                        />
                        {errors.largura && <p className="text-red-500 text-xs mt-1">{errors.largura}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Alt. (cm)*</label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 rounded-lg border ${errors.altura ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 font-bold`}
                          placeholder="0"
                          value={form.altura}
                          onChange={(e) => handleChange("altura", e.target.value)}
                        />
                        {errors.altura && <p className="text-red-500 text-xs mt-1">{errors.altura}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Peso (kg)*</label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 rounded-lg border ${errors.peso ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 font-bold`}
                          placeholder="0"
                          value={form.peso}
                          onChange={(e) => handleChange("peso", e.target.value)}
                        />
                        {errors.peso && <p className="text-red-500 text-xs mt-1">{errors.peso}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Volume (m³)</label>
                        <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 font-bold">
                          {form.volume}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo</label>
                      <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900" value={form.tipo} onChange={(e) => handleChange("tipo", e.target.value)}>
                        <option value="caixa">Caixa</option>
                        <option value="cilindrico">Cilindro</option>
                        <option value="palete">Palete</option>
                        <option value="pneu">Pneu</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Posição</label>
                      <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900" value={form.posicao} onChange={(e) => handleChange("posicao", e.target.value)}>
                        <option value="livre">Livre</option>
                        <option value="em_pe">Em pé</option>
                        <option value="deitado">Deitado</option>
                        <option value="de_lado">De lado</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Fragilidade</label>
                      <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900" value={form.fragilidade} onChange={(e) => handleChange("fragilidade", e.target.value)}>
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                      </select>
                    </div>
                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.empilhavel}
                          onChange={(e) => handleChange("empilhavel", e.target.checked)}
                          className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm font-semibold text-slate-700">Empilhável?</span>
                      </label>
                    </div>
                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.perigoso}
                          onChange={(e) => handleChange("perigoso", e.target.checked)}
                          className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm font-semibold text-slate-700">Perigoso?</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Cor</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={form.cor}
                        onChange={(e) => handleChange("cor", e.target.value)}
                        className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0"
                      />
                      <input
                        type="text"
                        value={form.cor}
                        onChange={(e) => handleChange("cor", e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900 uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button onClick={() => setOpenModal(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-white hover:border-slate-300 transition-all">Cancelar</button>
                <button onClick={salvarMercadoria} disabled={loading} className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-lg shadow-orange-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-all">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {editItem ? "Salvar Alterações" : "Cadastrar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {openImportModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpenImportModal(false)} />
            <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Importar CSV</h2>
                <button onClick={() => setOpenImportModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
              </div>

              <div className="p-6 overflow-y-auto">
                {!csvFile ? (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-orange-400 hover:bg-orange-50/30 transition-all group relative">
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
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
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
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
