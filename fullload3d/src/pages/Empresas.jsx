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
import {
  Building,
  Plus,
  Edit,
  Save,
  X,
  Upload,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Users,
  HardDrive,
  Calendar,
  Loader2,
  CheckCircle,
  Building2
} from "lucide-react";

export default function Empresas() {
  const [empresas, setEmpresas] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editEmpresa, setEditEmpresa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

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
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "empresas"));
      setEmpresas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erro ao carregar empresas:", err);
    } finally {
      setLoading(false);
    }
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
      setLoading(true);
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
        setSuccess("Empresa atualizada com sucesso!");
      } else {
        await addDoc(collection(db, "empresas"), {
          ...dadosParaSalvar,
          criadaEm: new Date(),
        });
        setSuccess("Empresa criada com sucesso!");
      }

      setTimeout(() => setSuccess(""), 3000);
      setOpenModal(false);
      carregarEmpresas();
    } catch (error) {
      console.error("Erro ao salvar empresa:", error);
      alert("Erro ao salvar empresa. Veja o console.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm((prev) => ({ ...prev, logoFile: file }));
    }
  };

  const PlanoBadge = ({ plano }) => {
    const config = {
      basic: { label: "Básico", color: "bg-blue-100 text-blue-700 border-blue-200" },
      premium: { label: "Premium", color: "bg-purple-100 text-purple-700 border-purple-200" },
      enterprise: { label: "Enterprise", color: "bg-orange-100 text-orange-700 border-orange-200" },
    };
    const { label, color } = config[plano] || config.basic;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>
        {label}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Building className="w-10 h-10 text-orange-500" />
              Gerenciamento de Empresas
            </h1>
            <p className="text-lg text-slate-600">Administre todas as empresas cadastradas</p>
          </div>

          <button
            onClick={abrirModalCriar}
            className="flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg shadow-orange-500/30 text-base font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 transition-all transform hover:scale-105"
          >
            <Plus size={20} /> Nova Empresa
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <p className="text-sm text-emerald-700 font-medium">{success}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h2 className="text-2xl font-bold text-slate-900">Empresas Cadastradas</h2>
            <p className="text-sm text-slate-500 mt-1">{empresas.length} empresas no sistema</p>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
              </div>
            ) : empresas.length === 0 ? (
              <div className="text-center py-16">
                <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg font-medium">Nenhuma empresa cadastrada</p>
                <p className="text-slate-400 text-sm mt-2">Adicione sua primeira empresa</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Empresa</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Contato</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Plano</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Limites</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="text-left py-4 px-8 text-xs font-bold text-slate-600 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {empresas.map((e, idx) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-8">
                        <div className="flex items-center gap-3">
                          {e.logoUrl ? (
                            <img
                              src={e.logoUrl}
                              alt={e.nome}
                              className="w-10 h-10 rounded-lg object-cover shadow-md"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-md">
                              {(e.nome || "E")[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-slate-900">{e.nome}</div>
                            {e.fantasia && <div className="text-xs text-slate-500">{e.fantasia}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-8">
                        <div className="space-y-1">
                          {e.email && (
                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{e.email}</span>
                            </div>
                          )}
                          {e.telefone && (
                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{e.telefone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-8">
                        <PlanoBadge plano={e.plano} />
                      </td>
                      <td className="py-4 px-8">
                        <div className="space-y-1 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>{e.limiteUsuarios} usuários</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <HardDrive className="w-3 h-3 text-slate-400" />
                            <span>{e.limiteArmazenamento} GB</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-8">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${e.ativo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {e.ativo ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                      <td className="py-4 px-8">
                        <button
                          onClick={() => abrirModalEditar(e)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-semibold transition-all"
                        >
                          <Edit size={14} /> Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal */}
        {openModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] overflow-auto p-4"
            onClick={() => setOpenModal(false)}
          >
            <div
              className="bg-white p-8 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6 text-slate-900">
                {editEmpresa ? "Editar Empresa" : "Nova Empresa"}
              </h2>

              <div className="space-y-6">
                {/* Logo Upload */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Logo da Empresa</label>
                  <div className="flex items-center gap-4">
                    {(form.logoUrl || form.logoFile) && (
                      <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200 shadow-md">
                        {form.logoFile ? (
                          <img
                            src={URL.createObjectURL(form.logoFile)}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={form.logoUrl}
                            alt="Logo atual"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    )}
                    <label className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 text-slate-700 hover:text-orange-600 font-semibold cursor-pointer transition-all">
                      <Upload size={16} />
                      <span>Escolher arquivo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Informações Básicas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nome da Empresa *</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                      placeholder="Razão Social"
                      value={form.nome}
                      onChange={(e) => handleChange("nome", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Fantasia</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                      placeholder="Nome comercial"
                      value={form.fantasia}
                      onChange={(e) => handleChange("fantasia", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">CNPJ</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                      placeholder="00.000.000/0000-00"
                      value={form.cnpj}
                      onChange={(e) => handleChange("cnpj", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Telefone</label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                      placeholder="(00) 00000-0000"
                      value={form.telefone}
                      onChange={(e) => handleChange("telefone", e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900"
                      placeholder="contato@empresa.com"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                    />
                  </div>
                </div>

                {/* Endereço */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    Endereço
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-white font-medium text-slate-900"
                        placeholder="Endereço completo"
                        value={form.endereco}
                        onChange={(e) => handleChange("endereco", e.target.value)}
                      />
                    </div>

                    <div>
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-white font-medium text-slate-900"
                        placeholder="Bairro"
                        value={form.bairro}
                        onChange={(e) => handleChange("bairro", e.target.value)}
                      />
                    </div>

                    <div>
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-white font-medium text-slate-900"
                        placeholder="Cidade"
                        value={form.cidade}
                        onChange={(e) => handleChange("cidade", e.target.value)}
                      />
                    </div>

                    <div>
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-white font-medium text-slate-900"
                        placeholder="Estado"
                        value={form.estado}
                        onChange={(e) => handleChange("estado", e.target.value)}
                        maxLength={2}
                      />
                    </div>

                    <div>
                      <input
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-white font-medium text-slate-900"
                        placeholder="CEP"
                        value={form.cep}
                        onChange={(e) => handleChange("cep", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Plano e Limites */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-orange-500" />
                    Plano e Configurações
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Plano</label>
                      <select
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-white font-medium text-slate-900"
                        value={form.plano}
                        onChange={(e) => handleChange("plano", e.target.value)}
                      >
                        <option value="basic">Básico</option>
                        <option value="premium">Premium</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Limite de Usuários</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-white font-medium text-slate-900"
                        value={form.limiteUsuarios}
                        onChange={(e) => handleChange("limiteUsuarios", Number(e.target.value))}
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Armazenamento (GB)</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-white font-medium text-slate-900"
                        value={form.limiteArmazenamento}
                        onChange={(e) => handleChange("limiteArmazenamento", Number(e.target.value))}
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Modo de Pagamento</label>
                      <select
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-white font-medium text-slate-900"
                        value={form.modoPagamento}
                        onChange={(e) => handleChange("modoPagamento", e.target.value)}
                      >
                        <option value="pix">PIX</option>
                        <option value="boleto">Boleto</option>
                        <option value="cartao">Cartão</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Dia de Vencimento</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-white font-medium text-slate-900"
                        value={form.diaVencimento}
                        onChange={(e) => handleChange("diaVencimento", Number(e.target.value))}
                        min="1"
                        max="31"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-8">
                      <input
                        type="checkbox"
                        id="ativo"
                        className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                        checked={form.ativo}
                        onChange={(e) => handleChange("ativo", e.target.checked)}
                      />
                      <label htmlFor="ativo" className="text-sm font-semibold text-slate-700">
                        Empresa Ativa
                      </label>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Observações</label>
                  <textarea
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900 resize-none"
                    rows="3"
                    placeholder="Informações adicionais..."
                    value={form.observacoes}
                    onChange={(e) => handleChange("observacoes", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-200">
                <button
                  onClick={() => setOpenModal(false)}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-all"
                >
                  <X size={16} /> Cancelar
                </button>

                <button
                  onClick={salvarEmpresa}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold shadow-lg transition-all disabled:opacity-70"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save size={16} /> Salvar Empresa</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
