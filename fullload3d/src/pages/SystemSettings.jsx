import React, { useEffect, useState } from "react";
import { db } from "../services/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import AdminLayout from "../layouts/AdminLayout";
import { Save, AlertTriangle, ShieldAlert, BadgeInfo, BellRing, Loader2, CheckCircle } from "lucide-react";

export default function SystemSettings() {
    const [settings, setSettings] = useState({
        maintenanceMode: false,
        allowRegistrations: true,
        globalAnnouncement: "",
        announcementType: "info", // info, warning, danger
        showAnnouncement: false,
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const docRef = doc(db, "system_settings", "global");
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setSettings(snap.data());
            }
        } catch (err) {
            console.error("Erro ao carregar configurações:", err);
        }
    };

    const handleChange = (field, value) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await setDoc(doc(db, "system_settings", "global"), settings);
            setSuccess("Configurações salvas com sucesso!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Erro ao salvar:", err);
            alert("Erro ao salvar configurações.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                        <BadgeInfo className="w-10 h-10 text-orange-500" />
                        Configurações do Sistema
                    </h1>
                    <p className="text-lg text-slate-600">Controles globais da plataforma</p>
                </div>

                {/* Success Message */}
                {success && (
                    <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg animate-fade-in shadow-sm">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            <p className="text-sm text-emerald-700 font-medium">{success}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Maintenance & Access */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <ShieldAlert className="w-6 h-6 text-red-500" />
                            Acesso e Manutenção
                        </h2>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div>
                                    <p className="font-bold text-slate-800">Modo Manutenção</p>
                                    <p className="text-sm text-slate-500">Bloqueia login de usuários comuns</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.maintenanceMode}
                                        onChange={(e) => handleChange("maintenanceMode", e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div>
                                    <p className="font-bold text-slate-800">Novos Cadastros</p>
                                    <p className="text-sm text-slate-500">Permitir novos registros</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.allowRegistrations}
                                        onChange={(e) => handleChange("allowRegistrations", e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Global Announcement */}
                    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <BellRing className="w-6 h-6 text-orange-500" />
                            Anúncio Global
                        </h2>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <input
                                    type="checkbox"
                                    id="showAnnouncement"
                                    className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                    checked={settings.showAnnouncement}
                                    onChange={(e) => handleChange("showAnnouncement", e.target.checked)}
                                />
                                <label htmlFor="showAnnouncement" className="text-sm font-semibold text-slate-700">
                                    Exibir Anúncio no Dashboard
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Mensagem</label>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none bg-slate-50 focus:bg-white font-medium text-slate-900 resize-none"
                                    rows="3"
                                    placeholder="Ex: Sistema passará por manutenção às 22h..."
                                    value={settings.globalAnnouncement}
                                    onChange={(e) => handleChange("globalAnnouncement", e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Alerta</label>
                                <div className="flex gap-4">
                                    {["info", "warning", "danger"].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => handleChange("announcementType", type)}
                                            className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all border-2 ${settings.announcementType === type
                                                    ? type === 'info' ? 'bg-blue-100 border-blue-500 text-blue-700'
                                                        : type === 'warning' ? 'bg-orange-100 border-orange-500 text-orange-700'
                                                            : 'bg-red-100 border-red-500 text-red-700'
                                                    : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-bold shadow-xl transition-all disabled:opacity-70 transform hover:scale-105"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save size={20} /> Salvar Alterações</>}
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
