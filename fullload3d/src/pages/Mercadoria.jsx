// src/pages/Mercadoria.jsx
import React, { useState, useEffect } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { db } from "../services/firebaseConfig";
import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc } from "firebase/firestore";
import Papa from "papaparse";
import { Edit, Trash2, FileText, Plus, Save, Package, Box, Circle, Loader2, CheckCircle } from "lucide-react";

export default function Mercadoria() {
  const empresaId = localStorage.getItem("empresaId");

  const [mercadorias, setMercadorias] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [importStatus, setImportStatus] = useState("");
  const [loading, setLoading] = useState(false);

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
  });

  useEffect(() => {
    if (!empresaId) return;
    carregarMercadorias();
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
    });
    setOpenModal(true);
  };

  const abrirModalEditar = (item) => {
    setEditItem(item);
    setForm({ ...item });
    setOpenModal(true);
  };

  const calcularVolume = (c, l, a) => ((c * l * a) / 1000000).toFixed(3);

  const handleChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    if (["comprimento", "largura", "altura"].includes(field)) {
      newForm.volume = Number(calcularVolume(newForm.comprimento, newForm.largura, newForm.altura));
    }
    setForm(newForm);
  };

  const salvarMercadoria = async () => {
    if (!form.nome) return alert("Nome da mercadoria é obrigatório.");
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
      };
      const mercadoriasRef = collection(db, "empresas", empresaId, "mercadorias");
      if (editItem) {
        await updateDoc(doc(db, "empresas", empresaId, "mercadorias", editItem.id), dadosParaSalvar);
      } else {
        await addDoc(mercadoriasRef, dadosParaSalvar);
      }
      setOpenModal(false);
      carregarMercadorias();
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
      alert("Erro ao excluir mercadoria. Veja console.");
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
            };
            await addDoc(mercadoriasRef, dados);
          }
          setImportStatus("Importação concluída!");
          setCsvFile(null);
          setCsvPreview([]);
          carregarMercadorias();
        } catch (err) {
          console.error(err);
          setImportStatus("Erro durante a importação.");
        }
      },
    });
  };

  const TipoBadge = ({ tipo }) => {
    const config = {
      caixa: { icon: Box, color: "bg-blue-100 text-blue-700 border-blue-200" },
      cilindrico: { icon: Circle, color: "bg-purple-100 text-purple-700 border-purple-200" },
      palete: { icon: Package, color: "bg-green-100 text-green-700 border-green-200" },
    };
    const { icon: Icon, color } = config[tipo] || config.caixa;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>
        <Icon className="w-3 h-3" />
        {tipo}
      </span>
    );
  };

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Package className="w-10 h-10 text-orange-500" />
              Mercadorias Logísticas
            </h1>
            <p className="text-lg text-slate-600">Gerencie seu inventário de produtos</p>
          </div>
          <div className="flex gap-3">
            <button onClick={abrirModalCriar} className="flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg shadow-orange-500/30 text-base font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 transition-all transform hover:scale-105">
              <Plus size={20} /> Nova Mercadoria
            </button>
            <button onClick={() => setOpenImportModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg shadow-slate-500/30 text-base font-bold text-white bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-700 hover:to-slate-600 transition-all transform hover:scale-105">
              <FileText size={20} /> Importar CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="text-2xl font-bold text-slate-900">Inventário</h2>
            <p className="text-sm text-slate-500 mt-1">{mercadorias.length} itens cadastrados</p>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
              </div>
            ) : mercadorias.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-medium">Nenhuma mercadoria cadastrada</p>
                <p className="text-slate-400 text-sm mt-2">Comece adicionando seu primeiro item</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Nome</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Código</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Tipo</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Qtd</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Peso(kg)</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Dimensões(cm)</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Volume(m³)</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="text-right py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mercadorias.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-md">
                            {idx + 1}
                          </div>
                          <span className="font-medium text-slate-900">{m.nome}</span>
                        </div>
                      </td>
                      <td className="py-4 px-8 text-slate-700">{m.codigo || "-"}</td>
                      <td className="py-4 px-8"><TipoBadge tipo={m.tipo} /></td>
                      <td className="py-4 px-8 font-semibold text-slate-700">{m.quantidade}</td>
                      <td className="py-4 px-8 text-slate-700">{m.peso}</td>
                      <td className="py-4 px-8 text-slate-700">{`${m.comprimento}×${m.largura}×${m.altura}`}</td>
                      <td className="py-4 px-8 text-slate-700">{m.volume.toFixed(3)}</td>
                      <td className="py-4 px-8">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${m.status === "ativo" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-4 px-8 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => abrirModalEditar(m)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-semibold transition-all">
                            <Edit size={14} /> Editar
                          </button>
                          <button onClick={() => excluirMercadoria(m.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold shadow-md transition-all">
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal CSV */}
        {openImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => { setOpenImportModal(false); setCsvPreview([]); }}>
            <div className="bg-white p-8 rounded-2xl w-[700px] shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-6 text-slate-900">Importar Mercadorias CSV</h2>
              <input type="file" accept=".csv" onChange={(e) => handleCSVUpload(e.target.files[0])} className="mb-4 w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50" />
              {csvPreview.length > 0 && (
                <div className="mb-4 overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                      <tr>
                        {Object.keys(csvPreview[0]).map((key) => (<th key={key} className="p-3 border-b border-slate-200 text-slate-700 font-semibold">{key}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          {Object.values(row).map((val, j) => (<td key={j} className="p-3 border-b border-slate-100 text-slate-700">{val}</td>))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button onClick={() => { setOpenImportModal(false); setCsvPreview([]); }} className="px-6 py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-all">Cancelar</button>
                <button onClick={importarCSV} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold shadow-lg transition-all">
                  <Save size={16} /> Importar
                </button>
              </div>
              {importStatus && <p className="mt-4 text-slate-700 font-medium">{importStatus}</p>}
            </div>
          </div>
        )}

        {/* Modal Criar/Editar */}
        {openModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] overflow-auto" onClick={() => setOpenModal(false)}>
            <div className="bg-white p-8 rounded-2xl w-[600px] shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-6 text-slate-900">{editItem ? "Editar Mercadoria" : "Nova Mercadoria"}</h2>
              <div className="space-y-4">
                <input className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900" placeholder="Nome" value={form.nome} onChange={(e) => handleChange("nome", e.target.value)} />
                <input className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900" placeholder="Código" value={form.codigo} onChange={(e) => handleChange("codigo", e.target.value)} />
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900" value={form.tipo} onChange={(e) => handleChange("tipo", e.target.value)}>
                  <option value="caixa">Caixa</option>
                  <option value="cilindrico">Cilíndrico</option>
                  <option value="palete">Palete</option>
                  <option value="sacola">Saco</option>
                  <option value="outro">Outro</option>
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900" placeholder="Quantidade" value={form.quantidade} onChange={(e) => handleChange("quantidade", Number(e.target.value))} />
                  <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900" placeholder="Peso (kg)" value={form.peso} onChange={(e) => handleChange("peso", Number(e.target.value))} step="0.01" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input type="number" className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900" placeholder="Comp. (cm)" value={form.comprimento} onChange={(e) => handleChange("comprimento", Number(e.target.value))} />
                  <input type="number" className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900" placeholder="Larg. (cm)" value={form.largura} onChange={(e) => handleChange("largura", Number(e.target.value))} />
                  <input type="number" className="px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900" placeholder="Alt. (cm)" value={form.altura} onChange={(e) => handleChange("altura", Number(e.target.value))} />
                </div>
                <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-900 font-medium" placeholder="Volume (m³)" value={form.volume} readOnly />
                <input type="number" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900" placeholder="Preço Unitário" value={form.precoUnitario} onChange={(e) => handleChange("precoUnitario", Number(e.target.value))} step="0.01" />
                <select className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900" value={form.status} onChange={(e) => handleChange("status", e.target.value)}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setOpenModal(false)} className="px-6 py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-all">Cancelar</button>
                <button onClick={salvarMercadoria} disabled={loading} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold shadow-lg transition-all disabled:opacity-70">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save size={16} /> Salvar</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
