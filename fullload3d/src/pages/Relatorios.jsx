import React, { useEffect, useState } from "react";
import ClientLayout from "../layouts/ClientLayout";
import { db, auth } from "../services/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { FileText, FileSpreadsheet, Package, Truck, Download, Calendar, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Relatorios() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalMercadorias: 0,
        totalVolume: 0,
        totalPeso: 0,
        totalCaminhoes: 0,
    });
    const [mercadorias, setMercadorias] = useState([]);
    const [caminhoes, setCaminhoes] = useState([]);
    const [planos, setPlanos] = useState([]);
    const [itemStats, setItemStats] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const empresaId = localStorage.getItem("empresaId");
            if (!empresaId) return;

            const mercadoriasSnap = await getDocs(collection(db, "empresas", empresaId, "mercadorias"));
            const caminhoesSnap = await getDocs(collection(db, "empresas", empresaId, "caminhoes"));
            const planosSnap = await getDocs(collection(db, "empresas", empresaId, "planos_carga"));

            const mercData = mercadoriasSnap.docs.map(d => d.data());
            const camData = caminhoesSnap.docs.map(d => d.data());
            const planosData = planosSnap.docs.map(d => d.data());

            setMercadorias(mercData);
            setCaminhoes(camData);
            setPlanos(planosData);

            // Stats Calculation
            const totalVol = mercData.reduce((acc, m) => acc + (Number(m.volume) * Number(m.quantidade || 1)), 0);
            const totalPeso = mercData.reduce((acc, m) => acc + (Number(m.peso) * Number(m.quantidade || 1)), 0);

            // Item Usage Analysis
            const usageMap = {};
            planosData.forEach(p => {
                if (p.items && Array.isArray(p.items)) {
                    p.items.forEach(item => {
                        if (!usageMap[item.nome]) {
                            usageMap[item.nome] = { nome: item.nome, totalQtd: 0, totalVol: 0 };
                        }
                        usageMap[item.nome].totalQtd += 1; // Assuming 1 instance per item entry in plan
                        usageMap[item.nome].totalVol += Number(item.volume || 0);
                    });
                }
            });
            const topItems = Object.values(usageMap).sort((a, b) => b.totalQtd - a.totalQtd).slice(0, 10);
            setItemStats(topItems);

            setStats({
                totalMercadorias: mercData.length,
                totalVolume: totalVol,
                totalPeso: totalPeso,
                totalCaminhoes: camData.length,
            });

        } catch (err) {
            console.error("Erro ao carregar dados:", err);
        } finally {
            setLoading(false);
        }
    };

    const exportXLSX = (data, filename) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Relatório");
        XLSX.writeFile(wb, `${filename}_${new Date().toLocaleDateString().replace(/\//g, "-")}.xlsx`);
    };

    const exportPDF = (title, columns, data, filename) => {
        const doc = new jsPDF();
        doc.text(title, 14, 20);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);

        autoTable(doc, {
            startY: 40,
            head: [columns],
            body: data,
        });

        doc.save(`${filename}_${new Date().toLocaleDateString().replace(/\//g, "-")}.pdf`);
    };

    const downloadMercadoriasPDF = () => {
        const cols = ["Nome", "Código", "Qtd", "Peso (kg)", "Volume (m³)"];
        const rows = mercadorias.map(m => [
            m.nome,
            m.codigo || "-",
            m.quantidade || 1,
            m.peso,
            m.volume
        ]);
        exportPDF("Relatório de Mercadorias", cols, rows, "mercadorias");
    };

    const downloadCaminhoesPDF = () => {
        const cols = ["Nome", "Modelo", "Placa", "Tara (kg)", "Capacidade (kg)"];
        const rows = caminhoes.map(c => [
            c.nome,
            c.modelo,
            c.placa || "-",
            c.tara,
            c.pesoMaximo || "-"
        ]);
        exportPDF("Relatório de Frota", cols, rows, "frota_veiculos");
    };

    const downloadPlanosPDF = () => {
        const cols = ["Nome do Plano", "Data Criação", "Qtd Itens", "Veículo Utilizado"];
        const rows = planos.map(p => [
            p.nome,
            new Date(p.dataCriacao?.seconds ? p.dataCriacao.seconds * 1000 : p.dataCriacao).toLocaleDateString(),
            p.items?.length || 0,
            p.veiculo?.nome || "Padrão"
        ]);
        exportPDF("Histórico de Cargas", cols, rows, "historico_cargas");
    };

    const downloadItemStatsPDF = () => {
        const cols = ["Nome do Item", "Total Utilizado (Qtd)", "Volume Total (m³)"];
        const rows = itemStats.map(i => [
            i.nome,
            i.totalQtd,
            i.totalVol.toFixed(3)
        ]);
        exportPDF("Top 10 Itens Mais Utilizados", cols, rows, "top_itens_utilizados");
    };

    return (
        <ClientLayout>
            <div className="min-h-screen bg-slate-50/50 p-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-orange-500" />
                        Relatórios
                    </h1>
                    <p className="text-slate-500">Visualize e exporte dados da sua operação.</p>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                    </div>
                ) : (
                    <>
                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-slate-500 text-sm font-semibold">Itens Cadastrados</p>
                                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalMercadorias}</h3>
                                    </div>
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <Package size={24} />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-slate-500 text-sm font-semibold">Volume Total</p>
                                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalVolume.toFixed(2)} m³</h3>
                                    </div>
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                        <Calendar size={24} /> {/* Using Calendar as generic icon or Box if better */}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-slate-500 text-sm font-semibold">Peso Total</p>
                                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalPeso.toFixed(0)} kg</h3>
                                    </div>
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                        <Download size={24} />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-slate-500 text-sm font-semibold">Veículos</p>
                                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalCaminhoes}</h3>
                                    </div>
                                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                        <Truck size={24} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Export Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Mercadorias Export */}
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Relatório de Mercadorias</h2>
                                        <p className="text-sm text-slate-500">Exportar lista completa de itens</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => exportXLSX(mercadorias, "mercadorias")}
                                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <FileSpreadsheet className="text-green-600" size={20} />
                                        Excel (XLSX)
                                    </button>
                                    <button
                                        onClick={downloadMercadoriasPDF}
                                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <FileText className="text-red-500" size={20} />
                                        PDF
                                    </button>
                                </div>
                            </div>

                            {/* Caminhões Export */}
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                                        <Truck size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Frota de Veículos</h2>
                                        <p className="text-sm text-slate-500">Exportar lista de caminhões</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => exportXLSX(caminhoes, "frota_veiculos")}
                                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <FileSpreadsheet className="text-green-600" size={20} />
                                        Excel (XLSX)
                                    </button>
                                    <button
                                        onClick={downloadCaminhoesPDF}
                                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <FileText className="text-red-500" size={20} />
                                        PDF
                                    </button>
                                </div>
                            </div>

                            {/* Histórico de Planos Export */}
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Histórico de Cargas</h2>
                                        <p className="text-sm text-slate-500">Log completo de planos criados</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => exportXLSX(planos.map(p => ({
                                            Nome: p.nome,
                                            Data: new Date(p.dataCriacao?.seconds ? p.dataCriacao.seconds * 1000 : p.dataCriacao).toLocaleDateString(),
                                            Itens: p.items?.length || 0,
                                            Veiculo: p.veiculo?.nome || "Padrão"
                                        })), "historico_cargas")}
                                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <FileSpreadsheet className="text-green-600" size={20} />
                                        Excel (XLSX)
                                    </button>
                                    <button
                                        onClick={downloadPlanosPDF}
                                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <FileText className="text-red-500" size={20} />
                                        PDF
                                    </button>
                                </div>
                            </div>

                            {/* Top 10 Itens Export */}
                            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                                        <Package size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Análise de Itens (Top 10)</h2>
                                        <p className="text-sm text-slate-500">Itens mais utilizados nos planos</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => exportXLSX(itemStats, "top_itens_utilizados")}
                                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <FileSpreadsheet className="text-green-600" size={20} />
                                        Excel (XLSX)
                                    </button>
                                    <button
                                        onClick={downloadItemStatsPDF}
                                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <FileText className="text-red-500" size={20} />
                                        PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </ClientLayout>
    );
}
