// src/pages/Caminhao.jsx
import React, { useState, useEffect, useMemo } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { db, storage } from "../services/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Papa from "papaparse";
import {
  Trash2,
  Pencil,
  Search,
  Truck,
  Ruler,
  Box,
  Image,
  CheckCircle,
  Loader2,
  FileText,
  Tag,
  Save,
  Plus,
  X,
  LayoutGrid,
  List as ListIcon,
  MoreVertical
} from "lucide-react";

export default function Caminhao() {
  const empresaId =
    typeof window !== "undefined" ? localStorage.getItem("empresaId") : null;

  // Form States
  const [nome, setNome] = useState("");
  const [modelo, setModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [comprimento, setComprimento] = useState("");
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [tara, setTara] = useState("");
  const [foto, setFoto] = useState(null);
  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});

  // UI States
  const [lista, setLista] = useState([]);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'

  // CSV Import States
  const [openImportModal, setOpenImportModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [importStatus, setImportStatus] = useState("");

  const carregar = async () => {
    try {
      setLoading(true);

      const colRef = collection(db, "empresas", empresaId, "caminhoes");
      const q = query(colRef, orderBy("nome"));
      const snap = await getDocs(q);

      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setLista(data);
    } catch (err) {
      console.error("Erro ao carregar caminhões:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (empresaId) carregar();
  }, [empresaId]);

  const uploadFoto = async (file) => {
    if (!file) return null;
    const storageRef = ref(storage, `caminhoes/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!nome.trim()) newErrors.nome = "Nome é obrigatório";
    if (Number(comprimento) <= 0) newErrors.comprimento = "Comprimento deve ser maior que 0";
    if (Number(largura) <= 0) newErrors.largura = "Largura deve ser maior que 0";
    if (Number(altura) <= 0) newErrors.altura = "Altura deve ser maior que 0";
    if (tara && Number(tara) < 0) newErrors.tara = "Tara não pode ser negativa";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSalvar = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let fotoUrl = null;
      if (foto) fotoUrl = await uploadFoto(foto);

      const caminhãoData = {
        nome,
        modelo: modelo || null,
        placa: placa || null,
        tamanhoBau: {
          L: parseFloat(comprimento),
          W: parseFloat(largura),
          H: parseFloat(altura),
        },
        tara: tara ? parseFloat(tara) : null,
        fotoUrl: fotoUrl || (editId ? lista.find(c => c.id === editId).fotoUrl : null),
      };

      if (editId) {
        const refDoc = doc(db, "empresas", empresaId, "caminhoes", editId);
        await updateDoc(refDoc, caminhãoData);
        setEditId(null);
      } else {
        await addDoc(
          collection(db, "empresas", empresaId, "caminhoes"),
          caminhãoData
        );
      }

      resetForm();
      setIsModalOpen(false);
      carregar();

      setMensagemSucesso("Caminhão salvo com sucesso!");
      setTimeout(() => setMensagemSucesso(""), 3000);
    } catch (err) {
      console.error("Erro ao salvar caminhão:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNome("");
    setModelo("");
    setPlaca("");
    setComprimento("");
    setLargura("");
    setAltura("");
    setTara("");
    setFoto(null);
    setEditId(null);
    setErrors({});
  };

  const handleEditar = (cam) => {
    setEditId(cam.id);
    setNome(cam.nome || "");
    setModelo(cam.modelo || "");
    setPlaca(cam.placa || "");
    setComprimento(cam.tamanhoBau?.L || "");
    setLargura(cam.tamanhoBau?.W || "");
    setAltura(cam.tamanhoBau?.H || "");
    setTara(cam.tara || "");
    setFoto(null);
    setErrors({});
    setIsModalOpen(true);
  };

  const handleExcluir = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este caminhão?")) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "empresas", empresaId, "caminhoes", id));
      carregar();
    } catch (err) {
      console.error("Erro ao excluir:", err);
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
          const colRef = collection(db, "empresas", empresaId, "caminhoes");
          for (const row of results.data) {
            const dados = {
              nome: row.nome || "Caminhão Importado",
              modelo: row.modelo || "",
              placa: row.placa || "",
              tamanhoBau: {
                L: Number(row.comprimento) || 1360,
                W: Number(row.largura) || 245,
                H: Number(row.altura) || 280,
              },
              tara: Number(row.tara) || 0,
              fotoUrl: null,
            };
            await addDoc(colRef, dados);
          }
          setImportStatus("Importação concluída!");
          setCsvFile(null);
          setCsvPreview([]);
          setOpenImportModal(false);
          carregar();
        } catch (err) {
          console.error(err);
          setImportStatus("Erro durante a importação.");
        }
      },
    });
  };

  const areaFormulario = (
    (parseFloat(comprimento || 0) / 100) *
    (parseFloat(largura || 0) / 100)
  ).toFixed(2);

  const volumeFormulario = (
    (parseFloat(comprimento || 0) / 100) *
    (parseFloat(largura || 0) / 100) *
    (parseFloat(altura || 0) / 100)
  ).toFixed(2);

  const listaFiltrada = useMemo(() => {
    return lista.filter((c) =>
      (c.nome && c.nome.toLowerCase().includes(filtro.toLowerCase())) ||
      (c.modelo && c.modelo.toLowerCase().includes(filtro.toLowerCase())) ||
      (c.placa && c.placa.toLowerCase().includes(filtro.toLowerCase()))
    ).filter(c => c.nome && c.modelo && c.placa);
  }, [filtro, lista]);

  const totalCaminhoes = listaFiltrada.length;

  const mediaArea = (
    listaFiltrada.reduce((acc, c) => {
      const area =
        ((Number(c.tamanhoBau?.L) || 0) / 100) *
        ((Number(c.tamanhoBau?.W) || 0) / 100);
      return acc + area;
    }, 0) / (totalCaminhoes || 1)
  ).toFixed(2);

  const mediaVolume = (
    listaFiltrada.reduce((acc, c) => {
      const area =
        ((Number(c.tamanhoBau?.L) || 0) / 100) *
        ((Number(c.tamanhoBau?.W) || 0) / 100);
      const volume = area * ((Number(c.tamanhoBau?.H) || 0) / 100);
      return acc + volume;
    }, 0) / (totalCaminhoes || 1)
  ).toFixed(2);

  const MetricCard = ({ icon: Icon, title, value, gradient, iconBg }) => (
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 group">
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity" style={{ background: gradient }}></div>
      <div className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} shadow-lg text-white`}>
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
              <Truck className="w-8 h-8 text-orange-500" />
              Frota de Caminhões
            </h1>
            <p className="text-slate-500 mt-1">Gerencie e monitore seus veículos de carga.</p>
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
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="px-4 py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/20 flex items-center gap-2"
            >
              <Plus size={18} />
              Novo Caminhão
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            icon={Truck}
            title="Total de Caminhões"
            value={totalCaminhoes}
            gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
          />
          <MetricCard
            icon={Ruler}
            title="Média de Área"
            value={`${mediaArea} m²`}
            gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            iconBg="bg-gradient-to-br from-pink-500 to-rose-600"
          />
          <MetricCard
            icon={Box}
            title="Média de Volume"
            value={`${mediaVolume} m³`}
            gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            iconBg="bg-gradient-to-br from-cyan-500 to-blue-600"
          />
        </div>

        {/* Controls & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, modelo ou placa..."
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
              {listaFiltrada.map((cam) => {
                const area = ((Number(cam.tamanhoBau?.L) || 0) / 100) * ((Number(cam.tamanhoBau?.W) || 0) / 100);
                const volume = area * ((Number(cam.tamanhoBau?.H) || 0) / 100);

                return (
                  <div
                    key={cam.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                  >
                    <div className="relative h-48 bg-slate-100 overflow-hidden">
                      {cam.fotoUrl ? (
                        <img
                          src={cam.fotoUrl}
                          alt={cam.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Truck size={48} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                      <div className="absolute bottom-4 left-4 text-white">
                        <h3 className="text-lg font-bold">{cam.nome}</h3>
                        <p className="text-sm opacity-90">{cam.modelo || "-"}</p>
                      </div>
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditar(cam)} className="p-2 bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-orange-600 rounded-lg transition-all">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleExcluir(cam.id)} className="p-2 bg-white/20 backdrop-blur-md hover:bg-red-500 text-white rounded-lg transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl">
                          <p className="text-xs text-slate-500 font-medium uppercase mb-1">Dimensões</p>
                          <p className="text-sm font-bold text-slate-700">{cam.tamanhoBau?.L}×{cam.tamanhoBau?.W}×{cam.tamanhoBau?.H}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl">
                          <p className="text-xs text-slate-500 font-medium uppercase mb-1">Volume</p>
                          <p className="text-sm font-bold text-slate-700">{volume.toFixed(2)} m³</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Tag size={14} />
                          <span>{cam.placa || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Box size={14} />
                          <span>{cam.tara || 0} kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Veículo</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Dimensões (cm)</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Volume</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Tara</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listaFiltrada.map((cam) => {
                    const area = ((Number(cam.tamanhoBau?.L) || 0) / 100) * ((Number(cam.tamanhoBau?.W) || 0) / 100);
                    const volume = area * ((Number(cam.tamanhoBau?.H) || 0) / 100);
                    return (
                      <tr key={cam.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                              {cam.fotoUrl ? (
                                <img src={cam.fotoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Truck size={20} className="text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{cam.nome}</p>
                              <p className="text-xs text-slate-500">{cam.modelo || "-"} • {cam.placa || "-"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                          {cam.tamanhoBau?.L} × {cam.tamanhoBau?.W} × {cam.tamanhoBau?.H}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-bold text-xs">
                            {volume.toFixed(2)} m³
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {cam.tara || "-"} kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditar(cam)} className="p-2 hover:bg-orange-50 text-slate-400 hover:text-orange-600 rounded-lg transition-colors">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleExcluir(cam.id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum caminhão encontrado</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-8">
              Você ainda não tem veículos cadastrados. Adicione seu primeiro caminhão para começar a planejar cargas.
            </p>
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/20 inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Cadastrar Agora
            </button>
          </div>
        )}

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />

            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl transform transition-all animate-fade-in-up overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  {editId ? <Pencil className="w-5 h-5 text-orange-500" /> : <Plus className="w-5 h-5 text-orange-500" />}
                  {editId ? "Editar Caminhão" : "Novo Caminhão"}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Veículo*</label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 rounded-xl border ${errors.nome ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900`}
                      placeholder="Ex: Scania R450"
                      value={nome}
                      onChange={(e) => { setNome(e.target.value); if (errors.nome) setErrors({ ...errors, nome: null }); }}
                    />
                    {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Modelo</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                        placeholder="Ex: R450"
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Placa</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                        placeholder="ABC-1234"
                        value={placa}
                        onChange={(e) => setPlaca(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Box size={14} className="text-orange-500" /> Dimensões do Baú
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Comp. (cm)*</label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 rounded-lg border ${errors.comprimento ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 font-bold`}
                          placeholder="0"
                          value={comprimento}
                          onChange={(e) => { setComprimento(e.target.value); if (errors.comprimento) setErrors({ ...errors, comprimento: null }); }}
                        />
                        {errors.comprimento && <p className="text-red-500 text-xs mt-1">{errors.comprimento}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Larg. (cm)*</label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 rounded-lg border ${errors.largura ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 font-bold`}
                          placeholder="0"
                          value={largura}
                          onChange={(e) => { setLargura(e.target.value); if (errors.largura) setErrors({ ...errors, largura: null }); }}
                        />
                        {errors.largura && <p className="text-red-500 text-xs mt-1">{errors.largura}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Alt. (cm)*</label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 rounded-lg border ${errors.altura ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 font-bold`}
                          placeholder="0"
                          value={altura}
                          onChange={(e) => { setAltura(e.target.value); if (errors.altura) setErrors({ ...errors, altura: null }); }}
                        />
                        {errors.altura && <p className="text-red-500 text-xs mt-1">{errors.altura}</p>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Tara (kg)</label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 rounded-lg border ${errors.tara ? "border-red-500" : "border-slate-200"} focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white text-slate-900 font-bold`}
                          placeholder="0"
                          value={tara}
                          onChange={(e) => { setTara(e.target.value); if (errors.tara) setErrors({ ...errors, tara: null }); }}
                        />
                        {errors.tara && <p className="text-red-500 text-xs mt-1">{errors.tara}</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Volume (m³)</label>
                        <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 font-bold">
                          {volumeFormulario}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      <Image className="w-4 h-4 inline mr-2" />
                      Foto (opcional)
                    </label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                      <input
                        type="file"
                        onChange={(e) => setFoto(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
                          <Image size={20} />
                        </div>
                        <p className="text-sm font-medium text-slate-600">
                          {foto ? foto.name : "Clique para fazer upload da imagem"}
                        </p>
                        <p className="text-xs text-slate-400">PNG, JPG até 5MB</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-white hover:border-slate-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-lg shadow-orange-500/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {editId ? "Salvar Alterações" : "Cadastrar"}
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
                    <p className="text-xs text-slate-400 mt-4">Colunas: nome, modelo, placa, comprimento, largura, altura, tara</p>
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
                        {csvPreview.length > 5 && (
                          <div className="p-2 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
                            + {csvPreview.length - 5} linhas...
                          </div>
                        )}
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
