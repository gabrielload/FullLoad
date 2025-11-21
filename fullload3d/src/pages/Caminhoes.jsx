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
import { Trash2, Pencil, Search, Truck, Ruler, Box, Image, CheckCircle, Loader2 } from "lucide-react";

export default function Caminhao() {
  const empresaId =
    typeof window !== "undefined" ? localStorage.getItem("empresaId") : null;

  const [modelo, setModelo] = useState("");
  const [comprimento, setComprimento] = useState("");
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [tara, setTara] = useState("");
  const [foto, setFoto] = useState(null);
  const [lista, setLista] = useState([]);
  const [editId, setEditId] = useState(null);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    try {
      setLoading(true);

      const colRef = collection(db, "empresas", empresaId, "caminhoes");
      const q = query(colRef, orderBy("modelo"));
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

  const handleSalvar = async () => {
    if (!modelo || !comprimento || !largura || !altura) {
      alert("Preencha todos os campos obrigatórios: Modelo e dimensões do baú.");
      return;
    }

    setLoading(true);
    try {
      let fotoUrl = null;
      if (foto) fotoUrl = await uploadFoto(foto);

      const caminhãoData = {
        modelo,
        tamanhoBau: {
          L: parseFloat(comprimento),
          W: parseFloat(largura),
          H: parseFloat(altura),
        },
        tara: tara ? parseFloat(tara) : null,
        fotoUrl,
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

      setModelo("");
      setComprimento("");
      setLargura("");
      setAltura("");
      setTara("");
      setFoto(null);

      carregar();

      setMensagemSucesso("Caminhão salvo com sucesso!");
      setTimeout(() => setMensagemSucesso(""), 3000);
    } catch (err) {
      console.error("Erro ao salvar caminhão:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (cam) => {
    setEditId(cam.id);
    setModelo(cam.modelo);
    setComprimento(cam.tamanhoBau?.L || "");
    setLargura(cam.tamanhoBau?.W || "");
    setAltura(cam.tamanhoBau?.H || "");
    setTara(cam.tara || "");
    setFoto(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      c.modelo.toLowerCase().includes(filtro.toLowerCase())
    );
  }, [filtro, lista]);

  const totalCaminhoes = listaFiltrada.length;

  const mediaArea = (
    listaFiltrada.reduce((acc, c) => {
      const area =
        ((c.tamanhoBau?.L || 0) / 100) *
        ((c.tamanhoBau?.W || 0) / 100);
      return acc + area;
    }, 0) / (totalCaminhoes || 1)
  ).toFixed(2);

  const mediaVolume = (
    listaFiltrada.reduce((acc, c) => {
      const area =
        ((c.tamanhoBau?.L || 0) / 100) *
        ((c.tamanhoBau?.W || 0) / 100);
      const volume = area * ((c.tamanhoBau?.H || 0) / 100);
      return acc + volume;
    }, 0) / (totalCaminhoes || 1)
  ).toFixed(2);

  const MetricCard = ({ icon: Icon, title, value, gradient, iconBg }) => (
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 group">
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity" style={{ background: gradient }}></div>
      <div className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</h3>
        <p className="text-4xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Truck className="w-10 h-10 text-orange-500" />
            Cadastro de Caminhões
          </h1>
          <p className="text-lg text-slate-600">
            Gerencie sua frota de veículos
          </p>
        </div>

        {/* Success Message */}
        {mensagemSucesso && (
          <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <p className="text-sm text-emerald-700 font-medium">{mensagemSucesso}</p>
            </div>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            {editId ? "Editar Caminhão" : "Novo Caminhão"}
          </h2>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Modelo*</label>
                <input
                  type="text"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="Ex: Scania R450"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tara (kg) — opcional</label>
                <input
                  type="number"
                  value={tara}
                  onChange={(e) => setTara(e.target.value)}
                  placeholder="Ex: 7000"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Comprimento (cm)*</label>
                <input
                  type="number"
                  value={comprimento}
                  onChange={(e) => setComprimento(e.target.value)}
                  placeholder="1360"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Largura (cm)*</label>
                <input
                  type="number"
                  value={largura}
                  onChange={(e) => setLargura(e.target.value)}
                  placeholder="245"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Altura (cm)*</label>
                <input
                  type="number"
                  value={altura}
                  onChange={(e) => setAltura(e.target.value)}
                  placeholder="280"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                />
              </div>
            </div>

            {comprimento && largura && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center gap-4 text-slate-700">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-5 h-5 text-orange-500" />
                    <span className="font-medium">Área:</span>
                    <span className="font-bold text-orange-600">{areaFormulario} m²</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Box className="w-5 h-5 text-orange-500" />
                    <span className="font-medium">Volume:</span>
                    <span className="font-bold text-orange-600">{volumeFormulario} m³</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Image className="w-4 h-4 inline mr-2" />
                Foto (opcional)
              </label>
              <input
                type="file"
                onChange={(e) => setFoto(e.target.files[0])}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white"
              />
            </div>

            <button
              onClick={handleSalvar}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl shadow-lg shadow-orange-500/30 text-base font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                editId ? "Salvar Alterações" : "Cadastrar Caminhão"
              )}
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por modelo..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-white shadow-sm font-medium text-slate-900"
            />
          </div>
        </div>

        {/* Truck Grid */}
        {listaFiltrada.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {listaFiltrada.map((cam) => {
              const area =
                ((cam.tamanhoBau?.L || 0) / 100) *
                ((cam.tamanhoBau?.W || 0) / 100);
              const volume = area * ((cam.tamanhoBau?.H || 0) / 100);

              return (
                <div
                  key={cam.id}
                  className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group"
                >
                  {cam.fotoUrl && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={cam.fotoUrl}
                        alt={`Foto ${cam.modelo}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                    </div>
                  )}

                  <div className="p-6 space-y-3">
                    <h3 className="text-xl font-bold text-slate-900">{cam.modelo}</h3>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Ruler className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">Dimensões:</span>
                        <span className="font-semibold text-slate-900">
                          {cam.tamanhoBau?.L} × {cam.tamanhoBau?.W} × {cam.tamanhoBau?.H} cm
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <Box className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">Área:</span>
                        <span className="font-semibold text-slate-900">{area.toFixed(2)} m²</span>
                        <span className="mx-2">|</span>
                        <span className="font-medium">Volume:</span>
                        <span className="font-semibold text-slate-900">{volume.toFixed(2)} m³</span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-600">
                        <Truck className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">Tara:</span>
                        <span className="font-semibold text-slate-900">{cam.tara || "-"} kg</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleEditar(cam)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-semibold transition-all"
                      >
                        <Pencil size={16} /> Editar
                      </button>

                      <button
                        onClick={() => handleExcluir(cam.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        <Trash2 size={16} /> Excluir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg border border-slate-100">
            <Truck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg font-medium">Nenhum caminhão encontrado</p>
            <p className="text-slate-400 text-sm mt-2">Cadastre seu primeiro veículo acima</p>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
