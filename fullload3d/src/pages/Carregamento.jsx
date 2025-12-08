// src/pages/Carregamento.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ClientLayout from "../layouts/ClientLayout";
import Modal from "../components/Modal";
import { db } from "../services/firebaseConfig";
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc } from "firebase/firestore";
import { Package, Plus, Calendar, Clock, CheckCircle, Loader2, FileDown, Trash2 } from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function Carregamento() {
  const navigate = useNavigate();
  const [descricao, setDescricao] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [status, setStatus] = useState("Em andamento");
  const [searchTerm, setSearchTerm] = useState(""); // Search state
  const [carregamentos, setCarregamentos] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [modal, setModal] = useState({ isOpen: false, title: "", message: "", type: "info", onConfirm: null, confirmText: "Confirmar" });

  const showModal = (title, message, type = "info", onConfirm = null, confirmText = "Confirmar") => {
    setModal({ isOpen: true, title, message, type, onConfirm, confirmText });
  };

  const closeModal = () => setModal({ ...modal, isOpen: false });

  // Edit & UI State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const queryParams = new URLSearchParams(window.location.search);
  const editId = queryParams.get("editId");

  const empresaId = localStorage.getItem("empresaId");

  useEffect(() => {
    if (!empresaId) return;

    const carregarDados = async () => {
      try {
        setLoading(true);

        // 1. Carregamentos
        const qCarreg = query(
          collection(db, "carregamentos"),
          where("empresaId", "==", empresaId),
          orderBy("dataEntrada", "desc")
        );
        const snapCarreg = await getDocs(qCarreg);
        setCarregamentos(snapCarreg.docs.map((d) => ({ id: d.id, ...d.data() })));

        // 2. Planos 3D
        const qPlanos = query(
          collection(db, "empresas", empresaId, "planos_carga"),
          orderBy("dataCriacao", "desc")
        );
        const snapPlanos = await getDocs(qPlanos);
        setPlanos(snapPlanos.docs.map((d) => ({ id: d.id, ...d.data() })));

      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
    carregarDados();
  }, [empresaId]);

  // Handle Edit Mode from URL
  useEffect(() => {
    if (editId && carregamentos.length > 0) {
      const item = carregamentos.find(c => c.id === editId);
      if (item) {
        setDescricao(item.descricao);
        setQuantidade(item.quantidade);
        setStatus(item.status);
        setEditingId(item.id);
        setShowForm(true);
      }
    }
  }, [editId, carregamentos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!descricao) {
      alert("Descrição é obrigatória.");
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        // Update existing
        // Note: You need to import updateDoc and doc
        const { updateDoc, doc } = await import("firebase/firestore");
        await updateDoc(doc(db, "carregamentos", editingId), {
          descricao,
          quantidade: Number(quantidade),
          status,
          dataSaida: status === "Finalizado" ? new Date() : null,
        });
        setSuccess("Carregamento atualizado com sucesso!");
      } else {
        // Create new
        await addDoc(collection(db, "carregamentos"), {
          empresaId,
          descricao,
          quantidade: Number(quantidade),
          status,
          dataEntrada: new Date(),
          dataSaida: status === "Finalizado" ? new Date() : null,
        });
        setSuccess("Carregamento salvo com sucesso!");
      }

      setDescricao("");
      setQuantidade(1);
      setStatus("Em andamento");
      setEditingId(null);
      setShowForm(false);
      navigate("/carregamento"); // Clear URL param

      setDescricao("");
      setQuantidade(1);
      setStatus("Em andamento");

      // Atualiza lista
      const q = query(
        collection(db, "carregamentos"),
        where("empresaId", "==", empresaId),
        orderBy("dataEntrada", "desc")
      );
      const snap = await getDocs(q);
      setCarregamentos(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // setSuccess("Carregamento salvo com sucesso!"); // Removed as it's handled above
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Erro ao salvar carregamento:", err);
      alert("Erro ao salvar carregamento. Veja console.");
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      "Em andamento": "bg-amber-100 text-amber-700 border-amber-200",
      "Finalizado": "bg-emerald-100 text-emerald-700 border-emerald-200",
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
        {status === "Em andamento" ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
        {status}
      </span>
    );
  };

  const handleDownloadPDF = (e, plan) => {
    e.stopPropagation(); // Prevent row click navigation

    // 1. If plan has a saved PDF URL, open it
    if (plan.pdfUrl) {
      window.open(plan.pdfUrl, "_blank");
      return;
    }

    // 2. Fallback: Generate text-based PDF
    const doc = new jsPDF();

    // Logo / Header
    doc.setFillColor(234, 88, 12); // Orange-600
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("FullLoad", 14, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Sistema de Otimização de Cargas", 14, 28);

    // Info Block
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Manifesto de Carga: ${plan.nome}`, 14, 55);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Documento: ${plan.documento || "-"}`, 14, 62);
    doc.text(`Processo: ${plan.processo || "-"}`, 14, 67);
    doc.text(`Data: ${new Date(plan.dataCriacao).toLocaleString()}`, 14, 72);

    // Group Items
    const itemsMap = {};
    if (plan.items) {
      plan.items.forEach(item => {
        const name = item.meta?.nome || "Item sem nome";
        const dims = `${item.scale[0].toFixed(0)}x${item.scale[1].toFixed(0)}x${item.scale[2].toFixed(0)}`;
        const key = `${name}-${dims}`;

        if (!itemsMap[key]) {
          itemsMap[key] = { name, dims, count: 0 };
        }
        itemsMap[key].count++;
      });
    }

    const tableColumn = ["Nome da Mercadoria", "Dimensões (cm)", "Quantidade"];
    const tableRows = Object.values(itemsMap).map(i => [
      i.name,
      i.dims,
      i.count
    ]);

    // Summary
    const totalItems = plan.items?.length || 0;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total de Itens Posicionados: ${totalItems}`, 14, 85);

    doc.autoTable({
      startY: 90,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12] }, // Orange-600
      styles: { fontSize: 10, cellPadding: 3 },
    });

    doc.save(`manifesto_${plan.documento || "plano"}.pdf`);
  };

  return (
    <ClientLayout>
      <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Package className="w-8 h-8 text-orange-500" />
              Carregamentos
            </h1>
            <p className="text-slate-500 mt-1">
              Gerencie seus planos e carregamentos salvos.
            </p>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-full md:w-96">
            <Package size={20} className="text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por descrição, nome ou documento..."
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl animate-fade-in flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <p className="text-sm text-emerald-700 font-medium">{success}</p>
          </div>
        )}

        {/* Lista de Carregamentos Manuais */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900">Carregamentos Recentes</h2>
            <p className="text-xs text-slate-500 mt-0.5">Cargas registradas manualmente</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Qtd</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carregamentos
                  .filter(c => c.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-700">{c.descricao}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={c.status} /></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{c.dataEntrada?.toDate ? c.dataEntrada.toDate().toLocaleDateString() : new Date().toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{c.quantidade}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => showModal("Aviso", "Este carregamento não possui um plano 3D associado.", "warning")}
                          className="px-3 py-1.5 bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-lg transition-colors text-xs font-bold"
                        >
                          Abrir 3D
                        </button>
                      </td>
                    </tr>
                  ))}
                {carregamentos.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-400">Nenhum carregamento manual encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lista de Planos 3D Salvos */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900">Planos 3D Salvos</h2>
            <p className="text-xs text-slate-500 mt-0.5">Histórico de planejamentos 3D</p>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
              </div>
            ) : planos.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">Nenhum plano 3D salvo</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Nome do Plano</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Documento</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Processo</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Itens</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {planos
                    .filter(p =>
                      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (p.documento && p.documento.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map((p, idx) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/FullLoad?planId=${p.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                              {idx + 1}
                            </div>
                            <span className="font-bold text-slate-700 group-hover:text-orange-600 transition-colors">{p.nome}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{p.documento || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{p.tipoCarga || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{p.processo || "-"}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Calendar size={14} />
                            <span>
                              {new Date(p.dataCriacao).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                            {p.items?.length || 0} itens
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/fullload3d?planId=${p.id}`); }}
                              className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-xs font-bold border border-orange-100"
                            >
                              Abrir 3D
                            </button>
                            <button
                              onClick={(e) => handleDownloadPDF(e, p)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Baixar PDF"
                            >
                              <FileDown size={18} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                showModal(
                                  "Excluir Plano",
                                  "Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.",
                                  "danger",
                                  async () => {
                                    try {
                                      await deleteDoc(doc(db, "empresas", empresaId, "planos_carga", p.id));
                                      setPlanos(planos.filter(plano => plano.id !== p.id));
                                      setSuccess("Plano excluído com sucesso!");
                                      setTimeout(() => setSuccess(""), 3000);
                                    } catch (err) {
                                      console.error("Erro ao excluir:", err);
                                      showModal("Erro", "Erro ao excluir plano.", "danger");
                                    }
                                  },
                                  "Excluir"
                                );
                              }}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir Plano"
                            >
                              <Trash2 size={18} />
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
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        type={modal.type}
        onConfirm={modal.onConfirm}
        confirmText={modal.confirmText}
      >
        <p>{modal.message}</p>
      </Modal>
    </ClientLayout>
  );
}
