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
    quantidade: 1,
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
      quantidade: 1,
      tipo: "caixa",
      peso: 0,
      comprimento: 0,
      largura: 0,
      altura: 0,
      volume: 0,
      precoUnitario: 0,
      status: "ativo",
      posicao: "livre",
      cor: getRandomColor(),
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
        cor: form.cor || "#ff7a18",
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
              cor: row.cor || "#ff7a18",
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
    };
    const { icon: Icon, color } = config[tipo] || config.caixa;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${color}`}>
        <Icon className="w-3 h-3" />
        {tipo}
      </span>
    );
  };

  const MetricCard = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">{title}</h3>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
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
            <p className="text-slate-500 mt-1">Gerencie seu inventário de produtos e embalagens.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setOpenImportModal(true)}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <FileText size={18} />
              Importar CSV
            </button>
            <button
              onClick={abrirModalCriar}
              className="px-4 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/20 flex items-center gap-2"
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
            color="bg-blue-500"
          />
          <MetricCard
            icon={Box}
            title="Volume Total"
            value={`${mercadorias.reduce((acc, m) => acc + (m.volume * m.quantidade), 0).toFixed(2)} m³`}
            color="bg-purple-500"
          />
          <MetricCard
            icon={Scale}
            title="Peso Total"
            value={`${mercadorias.reduce((acc, m) => acc + (m.peso * m.quantidade), 0).toFixed(0)} kg`}
            color="bg-emerald-500"
          />
        </div>

        {/* Controls & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-orange-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              title="Visualização em Grade"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-orange-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              title="Visualização em Lista"
            >
              <ListIcon size={20} />
            </button>
          </div>
        </div>

        {/* Success Message */}
        {mensagemSucesso && (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl animate-fade-in flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <p className="text-sm text-emerald-700 font-medium">{mensagemSucesso}</p>
          </div>
        )}

        {/* Content */}
        {listaFiltrada.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listaFiltrada.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="p-5 border-b border-slate-50 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ backgroundColor: m.cor }}>
                        {m.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 line-clamp-1">{m.nome}</h3>
                        <p className="text-xs text-slate-500 font-mono">{m.codigo || "S/C"}</p>
                      </div>
                    </div>
                    <TipoBadge tipo={m.tipo} />
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-xs text-slate-500 font-medium uppercase mb-1">Dimensões</p>
                        <p className="text-sm font-bold text-slate-700">{m.comprimento}×{m.largura}×{m.altura}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-xs text-slate-500 font-medium uppercase mb-1">Peso</p>
                        <p className="text-sm font-bold text-slate-700">{m.peso} kg</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-sm text-slate-500">
                        Qtd: <strong className="text-slate-900">{m.quantidade}</strong>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => abrirModalEditar(m)} className="p-2 hover:bg-orange-50 text-slate-400 hover:text-orange-600 rounded-lg transition-colors">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => excluirMercadoria(m.id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Dimensões</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Peso</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Qtd</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listaFiltrada.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm" style={{ backgroundColor: m.cor }}>
                            {m.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{m.nome}</p>
                            <p className="text-xs text-slate-500 font-mono">{m.codigo || "-"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><TipoBadge tipo={m.tipo} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{m.comprimento}×{m.largura}×{m.altura}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{m.peso} kg</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">{m.quantidade}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => abrirModalEditar(m)} className="p-2 hover:bg-orange-50 text-slate-400 hover:text-orange-600 rounded-lg transition-colors">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => excluirMercadoria(m.id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhuma mercadoria encontrada</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-8">
              Seu inventário está vazio. Adicione itens para começar a planejar suas cargas.
            </p>
            <button
              onClick={abrirModalCriar}
              className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/20 inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Adicionar Item
            </button>
          </div>
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
