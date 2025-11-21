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
import { Trash2, Pencil, PlusCircle, Search } from "lucide-react";

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

      // 📌 SALVANDO EM W, L, H (Firebase)
      const caminhãoData = {
        modelo,
        tamanhoBau: {
          L: parseFloat(comprimento), // comprimento
          W: parseFloat(largura),     // largura
          H: parseFloat(altura),      // altura
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

  return (
    <ClientLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <h1 className="text-3xl font-bold text-orange-600 flex items-center gap-2">
          <PlusCircle className="w-7 h-7" />
          Cadastro de Caminhões
        </h1>

        <div className="bg-white p-6 rounded-xl shadow border space-y-4">
          <h2 className="text-xl font-semibold">
            {editId ? "Editar Caminhão" : "Novo Caminhão"}
          </h2>

          {mensagemSucesso && (
            <div className="bg-green-100 text-green-800 p-2 rounded text-center">
              {mensagemSucesso}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Modelo*</label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ex: Scania R450"
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Tara (kg) — opcional</label>
              <input
                type="number"
                value={tara}
                onChange={(e) => setTara(e.target.value)}
                placeholder="Ex: 7000"
                className="w-full border p-2 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-medium mb-1">Comprimento (cm)*</label>
              <input
                type="number"
                value={comprimento}
                onChange={(e) => setComprimento(e.target.value)}
                placeholder="1360"
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Largura (cm)*</label>
              <input
                type="number"
                value={largura}
                onChange={(e) => setLargura(e.target.value)}
                placeholder="245"
                className="w-full border p-2 rounded"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Altura (cm)*</label>
              <input
                type="number"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                placeholder="280"
                className="w-full border p-2 rounded"
              />
            </div>
          </div>

          {comprimento && largura && (
            <p className="text-gray-700">
              Área da base: <b>{areaFormulario} m²</b> | Volume:{" "}
              <b>{volumeFormulario} m³</b>
            </p>
          )}

          <div>
            <label className="block font-medium mb-1">Foto (opcional)</label>
            <input
              type="file"
              onChange={(e) => setFoto(e.target.files[0])}
              className="w-full"
            />
          </div>

          <button
            onClick={handleSalvar}
            disabled={loading}
            className={`w-full py-2 rounded text-white transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-orange-600 hover:bg-orange-500"
            }`}
          >
            {editId ? "Salvar Alterações" : "Cadastrar Caminhão"}
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por modelo..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="border p-2 rounded"
            />
          </div>

          <div className="text-gray-700 text-sm md:text-base">
            <p>Total: <b>{totalCaminhoes}</b></p>
            <p>Média de área: <b>{mediaArea} m²</b></p>
            <p>Média de volume: <b>{mediaVolume} m³</b></p>
          </div>
        </div>

        {listaFiltrada.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listaFiltrada.map((cam) => {
              const area =
                ((cam.tamanhoBau?.L || 0) / 100) *
                ((cam.tamanhoBau?.W || 0) / 100);
              const volume = area * ((cam.tamanhoBau?.H || 0) / 100);

              return (
                <div
                  key={cam.id}
                  className="bg-white rounded-xl shadow border overflow-hidden hover:scale-105 transition"
                >
                  {cam.fotoUrl && (
                    <img
                      src={cam.fotoUrl}
                      alt={`Foto ${cam.modelo}`}
                      className="w-full h-40 object-cover"
                    />
                  )}

                  <div className="p-4 space-y-2">
                    <p><b>Modelo:</b> {cam.modelo}</p>

                    <p>
                      <b>Baú:</b>{" "}
                      {cam.tamanhoBau?.L} × {cam.tamanhoBau?.W} × {cam.tamanhoBau?.H} cm
                    </p>

                    <p><b>Área da base:</b> {area.toFixed(2)} m²</p>
                    <p><b>Volume:</b> {volume.toFixed(2)} m³</p>
                    <p><b>Tara:</b> {cam.tara || "-"} kg</p>

                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => handleEditar(cam)}
                        className="flex items-center gap-1 px-2 py-1 border rounded hover:bg-gray-100"
                      >
                        <Pencil size={16} /> Editar
                      </button>

                      <button
                        onClick={() => handleExcluir(cam.id)}
                        className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500"
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
          <p className="text-gray-500 text-center">Nenhum caminhão encontrado.</p>
        )}
      </div>
    </ClientLayout>
  );
}
