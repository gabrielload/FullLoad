// src/pages/Empresas.jsx
import React, { useEffect, useState } from "react";
import { db, storage } from "../services/firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import AdminLayout from "../layouts/AdminLayout";

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editEmpresa, setEditEmpresa] = useState(null);

  const [form, setForm] = useState({
    nome: "",
    fantasia: "",
    cnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    plano: "basic",
    limiteUsuarios: 5,
    limiteArmazenamento: 5,
    modoPagamento: "pix",
    diaVencimento: 5,
    ativo: true,
    observacoes: "",
    logoFile: null,
    logoUrl: "",
  });

  useEffect(() => {
    carregarEmpresas();
  }, []);

  const carregarEmpresas = async () => {
    const snap = await getDocs(collection(db, "empresas"));
    setEmpresas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const abrirModalCriar = () => {
    setEditEmpresa(null);
    setForm({
      nome: "",
      fantasia: "",
      cnpj: "",
      telefone: "",
      email: "",
      endereco: "",
      bairro: "",
      cidade: "",
      estado: "",
      cep: "",
      plano: "basic",
      limiteUsuarios: 5,
      limiteArmazenamento: 5,
      modoPagamento: "pix",
      diaVencimento: 5,
      ativo: true,
      observacoes: "",
      logoFile: null,
      logoUrl: "",
    });
    setOpenModal(true);
  };

  const abrirModalEditar = (empresa) => {
    setEditEmpresa(empresa);
    setForm({
      ...empresa,
      limiteUsuarios: Number(empresa.limiteUsuarios),
      limiteArmazenamento: Number(empresa.limiteArmazenamento),
      diaVencimento: Number(empresa.diaVencimento),
      ativo: Boolean(empresa.ativo),
      logoFile: null,
      logoUrl: empresa.logoUrl || "",
    });
    setOpenModal(true);
  };

  const salvarEmpresa = async () => {
    if (!form.nome) {
      alert("O nome da empresa é obrigatório.");
      return;
    }

    try {
      let logoUrl = form.logoUrl;

      // Se houver novo arquivo, faz upload
      if (form.logoFile) {
        const logoRef = ref(storage, `logos/${Date.now()}_${form.logoFile.name}`);
        await uploadBytes(logoRef, form.logoFile);
        logoUrl = await getDownloadURL(logoRef);
      }

      // Remove logoFile antes de enviar pro Firestore
      const { logoFile, ...rest } = form;
      const dadosParaSalvar = {
        ...rest,
        logoUrl,
        limiteUsuarios: Number(form.limiteUsuarios),
        limiteArmazenamento: Number(form.limiteArmazenamento),
        diaVencimento: Number(form.diaVencimento),
        ativo: Boolean(form.ativo),
      };

      if (editEmpresa) {
        await updateDoc(doc(db, "empresas", editEmpresa.id), dadosParaSalvar);
      } else {
        await addDoc(collection(db, "empresas"), {
          ...dadosParaSalvar,
          criadaEm: new Date(),
        });
      }

      setOpenModal(false);
      carregarEmpresas();
    } catch (error) {
      console.error("Erro ao salvar empresa:", error);
      alert("Erro ao salvar empresa. Veja o console.");
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">

        {/* CARD DE AÇÕES */}
        <div className="bg-white p-5 rounded-xl shadow border mb-6 flex justify-between items-center">
          <h1 className="text-lg font-semibold">Cadastro de Empresas</h1>
          <button
            onClick={abrirModalCriar}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded"
          >
            + Nova Empresa
          </button>
        </div>

        {/* LISTA */}
        <div className="bg-white p-5 rounded-xl shadow border overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b">
              <tr className="text-gray-600">
                <th>Logo</th>
                <th className="py-3">Nome</th>
                <th>CNPJ</th>
                <th>Plano</th>
                <th>Usuários</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((emp) => (
                <tr key={emp.id} className="border-b last:border-none">
                  <td>
                    {emp.logoUrl ? (
                      <img src={emp.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded" />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-3">{emp.nome}</td>
                  <td>{emp.cnpj || "-"}</td>
                  <td className="uppercase">{emp.plano}</td>
                  <td>{emp.limiteUsuarios}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        emp.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {emp.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => abrirModalEditar(emp)}
                      className="text-blue-600 hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {openModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] overflow-auto">
          <div className="bg-white p-6 rounded-xl w-[500px] shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editEmpresa ? "Editar Empresa" : "Nova Empresa"}
            </h2>

            <div className="space-y-3">

              {/* Logo */}
              <div>
                <label className="text-sm">Logo da Empresa</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setForm({ ...form, logoFile: e.target.files[0] })}
                  className="w-full p-2 border rounded"
                />
                {form.logoFile && (
                  <img
                    src={URL.createObjectURL(form.logoFile)}
                    alt="Preview Logo"
                    className="h-16 mt-2 rounded"
                  />
                )}
                {!form.logoFile && form.logoUrl && (
                  <img src={form.logoUrl} alt="Logo Atual" className="h-16 mt-2 rounded" />
                )}
              </div>

              {/* Campos do formulário */}
              <div>
                <label className="text-sm">Nome da Empresa</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="text-sm">Nome Fantasia</label>
                <input
                  value={form.fantasia}
                  onChange={(e) => setForm({ ...form, fantasia: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="text-sm">CNPJ</label>
                <input
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="text-sm">Telefone</label>
                <input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="text-sm">Email Administrativo</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="text-sm">Endereço</label>
                <input
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm">Bairro</label>
                  <input
                    value={form.bairro}
                    onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="text-sm">CEP</label>
                  <input
                    value={form.cep}
                    onChange={(e) => setForm({ ...form, cep: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm">Cidade</label>
                  <input
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="text-sm">Estado</label>
                  <input
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm">Plano</label>
                <select
                  value={form.plano}
                  onChange={(e) => setForm({ ...form, plano: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="text-sm">Modo de Pagamento</label>
                <select
                  value={form.modoPagamento}
                  onChange={(e) => setForm({ ...form, modoPagamento: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="pix">Pix</option>
                  <option value="cartao">Cartão de Crédito</option>
                  <option value="boleto">Boleto</option>
                  <option value="faturado">Faturado (mensal)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm">Limite de Usuários</label>
                  <input
                    type="number"
                    value={form.limiteUsuarios}
                    onChange={(e) => setForm({ ...form, limiteUsuarios: Number(e.target.value) })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="text-sm">Armazenamento (GB)</label>
                  <input
                    type="number"
                    value={form.limiteArmazenamento}
                    onChange={(e) => setForm({ ...form, limiteArmazenamento: Number(e.target.value) })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm">Dia de Vencimento</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.diaVencimento}
                  onChange={(e) => setForm({ ...form, diaVencimento: Number(e.target.value) })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="text-sm">Status</label>
                <select
                  value={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.value === "true" })}
                  className="w-full p-2 border rounded"
                >
                  <option value="true">Ativa</option>
                  <option value="false">Inativa</option>
                </select>
              </div>

              <div>
                <label className="text-sm">Observações Internas</label>
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  className="w-full p-2 border rounded h-20"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end mt-5 gap-2">
              <button
                onClick={() => setOpenModal(false)}
                className="px-4 py-2 border rounded"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEmpresa}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
