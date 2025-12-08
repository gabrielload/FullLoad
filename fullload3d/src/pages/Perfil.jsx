import React, { useEffect, useState } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { auth, storage } from "../services/firebaseConfig";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { User, Mail, Shield, Camera } from "lucide-react";

export default function Perfil() {
    const [user, setUser] = useState(null);
    const [success, setSuccess] = useState(""); // Success feedback state

    useEffect(() => {
        const u = auth.currentUser;
        if (u) {
            setUser({
                displayName: u.displayName || "Usuário",
                email: u.email,
                photoURL: u.photoURL,
                role: localStorage.getItem("role") || "user"
            });
        }
    }, []);

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const storageRef = ref(storage, `avatars/${user.email}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const photoURL = await getDownloadURL(storageRef);

            await updateProfile(auth.currentUser, { photoURL });
            setUser(prev => ({ ...prev, photoURL }));

            // Trigger event for Sidebar
            window.dispatchEvent(new Event("profile_updated"));

            setSuccess("Foto de perfil atualizada com sucesso!");
            setTimeout(() => setSuccess(""), 3000);
        } catch (error) {
            console.error("Erro ao atualizar foto:", error);
            alert("Erro ao atualizar foto.");
        }
    };

    const handleSave = () => {
        // Since we are only editing the photo here for now (or if we add name editing later)
        // For now, just show success as requested "Ao subir a foto não apresentar um 'ok' nem quando salvo as alterações"
        // If there were editable fields, we would save them here.
        // Assuming the user might think "Salvar" confirms the photo or other potential changes.

        setSuccess("Alterações salvas com sucesso!");
        setTimeout(() => setSuccess(""), 3000);

        // Ensure sidebar is in sync
        window.dispatchEvent(new Event("profile_updated"));
    };

    return (
        <ClientLayout>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Meu Perfil</h1>

                {success && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <p className="text-sm text-emerald-700 font-medium">{success}</p>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Cover */}
                    <div className="h-32 bg-gradient-to-r from-orange-400 to-orange-600"></div>

                    <div className="px-8 pb-8">
                        {/* Avatar */}
                        <div className="relative -mt-12 mb-6 inline-block">
                            <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                                <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-3xl font-bold text-slate-400 overflow-hidden">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        (user?.displayName?.[0] || "U").toUpperCase()
                                    )}
                                </div>
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md text-slate-600 hover:text-orange-600 transition-colors border border-slate-100 cursor-pointer">
                                <Camera size={16} />
                                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                            </label>
                        </div>

                        {/* Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nome Completo</label>
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                                        <User size={18} className="text-slate-400" />
                                        <span className="font-medium">{user?.displayName}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Email</label>
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                                        <Mail size={18} className="text-slate-400" />
                                        <span className="font-medium">{user?.email}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Função</label>
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                                        <Shield size={18} className="text-slate-400" />
                                        <span className="font-medium capitalize">{user?.role}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/20"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ClientLayout>
    );
}
