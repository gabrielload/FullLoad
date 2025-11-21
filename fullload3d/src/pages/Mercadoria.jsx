// src/pages/Mercadoria.jsx
import React, { useState, useEffect } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { db } from "../services/firebaseConfig";
import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc } from "firebase/firestore";
import Papa from "papaparse";
import { Edit, Trash2, FileText, Plus, Save } from "lucide-react";

export default function Mercadoria() {
  const empresaId = localStorage.getItem("empresaId");

  const [mercadorias, setMercadorias] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [openImportModal, setOpenImportModal] = useState(false);
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
  });

  useEffect(() => {
    if (!empresaId) return;
    carregarMercadorias();
  }, [empresaId]);

  const carregarMercadorias = async () => {
    try {
      const mercadoriasRef = collection(db, "empresas", empresaId, "mercadorias");
      const snap = await getDocs(mercadoriasRef);
      setMercadorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar mercadorias:", err);
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
    }
  };

  const excluirMercadoria = async (id) => {
    if (!confirm("Deseja realmente excluir esta mercadoria?")) return;
    try {
      await deleteDoc(doc(db, "empresas", empresaId, "mercadorias", id));
      carregarMercadorias();
    } catch (err) {
      console.error("Erro ao excluir mercadoria:", err);
      alert("Erro ao excluir mercadoria. Veja console.");
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

  const btnOrange = "bg-orange-500 hover:bg-orange-600 text-white";

  return (
    <ClientLayout>
      <div className="p-6 space-y-6 bg-[#F8F8F8] min-h-screen">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">Mercadorias Logísticas</h2>
          <div className="flex gap-2">
            <button onClick={abrirModalCriar} className={`flex items-center gap-2 px-4 py-2 rounded shadow ${btnOrange}`}>
              <Plus size={16} /> Nova Mercadoria
            </button>
            <button onClick={() => setOpenImportModal(true)} className={`flex items-center gap-2 px-4 py-2 rounded shadow ${btnOrange}`}>
              <FileText size={16} /> Importar CSV
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl shadow overflow-x-auto border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100">
              <tr className="text-gray-700">
                <th className="p-3">Nome</th>
                <th>Código</th>
                <th>Tipo</th>
                <th>Qtd</th>
                <th>Peso(kg)</th>
                <th>Dimensões(cm)</th>
                <th>Volume(m³)</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mercadorias.map(m => (
                <tr key={m.id} className="border-b border-gray-200 hover:bg-gray-50 transition-all duration-150">
                  <td className="p-2 font-medium text-gray-900">{m.nome}</td>
                  <td className="text-gray-700">{m.codigo || "-"}</td>
                  <td className="text-gray-700">{m.tipo}</td>
                  <td className="text-gray-700">{m.quantidade}</td>
                  <td className="text-gray-700">{m.peso}</td>
                  <td className="text-gray-700">{`${m.comprimento}x${m.largura}x${m.altura}`}</td>
                  <td className="text-gray-700">{m.volume.toFixed(3)}</td>
                  <td>
                    <span className={`px-2 py-1 rounded text-sm ${m.status === "ativo" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="text-right flex justify-end gap-2">
                    <button onClick={() => abrirModalEditar(m)} className={`flex items-center gap-1 px-3 py-1 rounded shadow ${btnOrange}`}>
                      <Edit size={16} /> Editar
                    </button>
                    <button onClick={() => excluirMercadoria(m.id)} className={`flex items-center gap-1 px-3 py-1 rounded shadow ${btnOrange}`}>
                      <Trash2 size={16} /> Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal CSV */}
        {openImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={() => { setOpenImportModal(false); setCsvPreview([]); }}>
            <div className="bg-white p-6 rounded-xl w-[600px] shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Importar Mercadorias CSV</h2>
              <input type="file" accept=".csv" onChange={(e) => handleCSVUpload(e.target.files[0])} className="mb-4"/>
              {csvPreview.length > 0 && (
                <div className="mb-4 overflow-x-auto border border-gray-200 rounded">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        {Object.keys(csvPreview[0]).map((key) => (<th key={key} className="p-2 border border-gray-200 text-gray-700">{key}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {Object.values(row).map((val, j) => (<td key={j} className="p-2 border border-gray-200 text-gray-700">{val}</td>))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button onClick={() => { setOpenImportModal(false); setCsvPreview([]); }} className="px-4 py-2 border rounded text-gray-700">Cancelar</button>
                <button onClick={importarCSV} className={`flex items-center gap-1 px-4 py-2 rounded ${btnOrange}`}>
                  <Save size={16} /> Importar
                </button>
              </div>
              {importStatus && <p className="mt-3 text-gray-700">{importStatus}</p>}
            </div>
          </div>
        )}

        {/* Modal Criar/Editar */}
        {openModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] overflow-auto" onClick={() => setOpenModal(false)}>
            <div className="bg-white p-6 rounded-xl w-[500px] shadow-xl max-h-[90vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-semibold mb-4 text-gray-900">{editItem ? "Editar Mercadoria" : "Nova Mercadoria"}</h2>
              <div className="space-y-3">
                <input className="w-full p-2 border border-gray-300 rounded text-gray-900" placeholder="Nome" value={form.nome} onChange={(e) => handleChange("nome", e.target.value)} />
                <input className="w-full p-2 border border-gray-300 rounded text-gray-900" placeholder="Código" value={form.codigo} onChange={(e) => handleChange("codigo", e.target.value)} />
                <select className="w-full p-2 border border-gray-300 rounded text-gray-900" value={form.tipo} onChange={(e) => handleChange("tipo", e.target.value)}>
                  <option value="caixa">Caixa</option>
                  <option value="cilindrico">Cilíndrico</option>
                  <option value="palete">Palete</option>
                  <option value="sacola">Saco</option>
                  <option value="outro">Outro</option>
                </select>
                <input type="number" className="w-full p-2 border border-gray-300 rounded text-gray-900" placeholder="Quantidade" value={form.quantidade} onChange={(e) => handleChange("quantidade", Number(e.target.value))} />
                <input type="number" className="w-full p-2 border border-gray-300 rounded text-gray-900" placeholder="Peso (kg)" value={form.peso} onChange={(e) => handleChange("peso", Number(e.target.value))} step="0.01"/>
                <div className="grid grid-cols-3 gap-2">
                  <input type="number" className="p-2 border border-gray-300 rounded text-gray-900" placeholder="Comprimento (cm)" value={form.comprimento} onChange={(e) => handleChange("comprimento", Number(e.target.value))}/>
                  <input type="number" className="p-2 border border-gray-300 rounded text-gray-900" placeholder="Largura (cm)" value={form.largura} onChange={(e) => handleChange("largura", Number(e.target.value))}/>
                  <input type="number" className="p-2 border border-gray-300 rounded text-gray-900" placeholder="Altura (cm)" value={form.altura} onChange={(e) => handleChange("altura", Number(e.target.value))}/>
                </div>
                <input type="number" className="w-full p-2 border border-gray-300 rounded bg-gray-100 text-gray-900" placeholder="Volume (m³)" value={form.volume} readOnly />
                <input type="number" className="w-full p-2 border border-gray-300 rounded text-gray-900" placeholder="Preço Unitário" value={form.precoUnitario} onChange={(e) => handleChange("precoUnitario", Number(e.target.value))} step="0.01"/>
                <select className="w-full p-2 border border-gray-300 rounded text-gray-900" value={form.status} onChange={(e) => handleChange("status", e.target.value)}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setOpenModal(false)} className="px-4 py-2 border rounded text-gray-700">Cancelar</button>
                <button onClick={salvarMercadoria} className={`flex items-center gap-1 px-4 py-2 rounded ${btnOrange}`}>
                  <Save size={16} /> Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
