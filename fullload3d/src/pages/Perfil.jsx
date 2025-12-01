import React, { useEffect, useState } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { auth } from "../services/firebaseConfig";
import { User, Mail, Shield, Camera } from "lucide-react";

export default function Perfil() {
    const [user, setUser] = useState(null);

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

    return (
        <ClientLayout>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Meu Perfil</h1>

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
                            <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md text-slate-600 hover:text-orange-600 transition-colors border border-slate-100">
                                <Camera size={16} />
                            </button>
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
                            <button className="px-6 py-2 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-500/20">
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ClientLayout>
    );
}
