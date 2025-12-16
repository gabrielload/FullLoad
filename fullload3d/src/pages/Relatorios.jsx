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

    const exportPDF = async (title, columns, data, filename) => {
        const doc = new jsPDF();

        // Load Logo
        const logoUrl = "/logo-orange.png";

        try {
            const img = new Image();
            img.src = logoUrl;
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            // Add Logo (x, y, width, height)
            doc.addImage(img, "PNG", 14, 10, 30, 10); // Aspect ratio approx 3:1

            // Header Text (shifted down)
            doc.setFontSize(18);
            doc.text(title, 14, 35);

            doc.setFontSize(10);
            doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 42);

            autoTable(doc, {
                startY: 50,
                head: [columns],
                body: data,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [249, 115, 22] } // Orange header
            });

            doc.save(`${filename}_${new Date().toLocaleDateString().replace(/\//g, "-")}.pdf`);
        } catch (error) {
            console.error("Erro ao carregar logo para PDF:", error);
            // Fallback without logo
            doc.text(title, 14, 20);
            doc.save(`${filename}.pdf`);
        }
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

                        {/* --- NEW SECTION: DETAILED HISTORY TABLE (Migration from 3D Menu) --- */}
                        <DetailedHistory planos={planos} />
                    </>
                )}
            </div>
        </ClientLayout>
    );
}

// Subcomponent for the new Detailed History Section
function DetailedHistory({ planos }) {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [filtered, setFiltered] = useState([]);

    // Initialize with all plans sorted by newest
    useEffect(() => {
        setFiltered(planos.sort((a, b) => {
            const dateA = a.dataCriacao?.seconds ? new Date(a.dataCriacao.seconds * 1000) : new Date(a.dataCriacao || 0);
            const dateB = b.dataCriacao?.seconds ? new Date(b.dataCriacao.seconds * 1000) : new Date(b.dataCriacao || 0);
            return dateB - dateA;
        }));
    }, [planos]);

    const handleFilter = () => {
        if (!startDate && !endDate) {
            setFiltered(planos);
            return;
        }

        let start = startDate ? new Date(startDate) : new Date("2000-01-01");
        let end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        const res = planos.filter(p => {
            const d = p.dataCriacao?.seconds ? new Date(p.dataCriacao.seconds * 1000) : new Date(p.dataCriacao);
            return d >= start && d <= end;
        });

        // Ensure sort is maintained
        res.sort((a, b) => {
            const dateA = a.dataCriacao?.seconds ? new Date(a.dataCriacao.seconds * 1000) : new Date(a.dataCriacao || 0);
            const dateB = b.dataCriacao?.seconds ? new Date(b.dataCriacao.seconds * 1000) : new Date(b.dataCriacao || 0);
            return dateB - dateA;
        });

        setFiltered(res);
    };

    const clearFilter = () => {
        setStartDate("");
        setEndDate("");
        setFiltered(planos);
    }

    return (
        <div className="mt-10 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="text-orange-500" size={24} />
                        Histórico de Cargas Detalhado
                    </h2>
                    <p className="text-sm text-slate-500">Consulte e baixe planos anteriores.</p>
                </div>

                {/* Filters */}
                <div className="flex items-end gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1">Início</label>
                        <input
                            type="date"
                            className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none focus:border-orange-500"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1">Fim</label>
                        <input
                            type="date"
                            className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 outline-none focus:border-orange-500"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleFilter}
                        className="bg-orange-600 hover:bg-orange-500 text-white p-2 rounded-lg transition-colors shadow-sm"
                        title="Filtrar"
                    >
                        <div className="w-5 h-5 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                        </div>
                    </button>
                    {(startDate || endDate) && (
                        <button
                            onClick={clearFilter}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-2 rounded-lg transition-colors"
                            title="Limpar Filtros"
                        >
                            <div className="w-5 h-5 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </div>
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0">
                        <tr>
                            <th className="p-4 border-b border-slate-100">Nome do Plano</th>
                            <th className="p-4 border-b border-slate-100">Data</th>
                            <th className="p-4 border-b border-slate-100">Veículo</th>
                            <th className="p-4 border-b border-slate-100 text-center">Itens</th>
                            <th className="p-4 border-b border-slate-100 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-50">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-slate-400">
                                    Nenhum plano encontrado neste período.
                                </td>
                            </tr>
                        ) : (
                            filtered.map(plan => (
                                <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-4 font-medium text-slate-800">
                                        {plan.nome || "Plano Sem Nome"}
                                        {plan.documento && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{plan.documento}</span>}
                                    </td>
                                    <td className="p-4 text-slate-500">
                                        {new Date(plan.dataCriacao?.seconds ? plan.dataCriacao.seconds * 1000 : (plan.dataCriacao || Date.now())).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Truck size={14} className="text-slate-400" />
                                            {plan.veiculo?.modelo || plan.veiculo?.nome || "Padrão"}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                            {plan.items?.length || 0}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {plan.pdfUrl ? (
                                            <a
                                                href={plan.pdfUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 rounded-lg text-xs font-bold transition-colors border border-orange-200"
                                            >
                                                <Download size={14} />
                                                Baixar PDF
                                            </a>
                                        ) : (
                                            <span className="text-slate-300 text-xs italic select-none">Sem PDF</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Summary of filtered views */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
                <span>Exibindo {filtered.length} registro(s)</span>
                {filtered.length > 0 && (
                    <span className="italic">
                        * Para exportar esta lista, utilize os botões "Histórico de Cargas" acima.
                    </span>
                )}
            </div>
        </div>
    );
}
