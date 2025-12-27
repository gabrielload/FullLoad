import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Generates a Step-by-Step PDF Report
 * @param {Object} docInfo - Metadata { documento, tipoCarga }
 * @param {Array} steps - Array of { title, image, items: [] }
 * @param {Object} summary - { totalWeight, totalItems, distributionStatus }
 */
export const generateStepReportBlob = async (docInfo, steps, summary) => {
    const doc = new jsPDF({ orientation: "portrait", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleString();

    // Helper: Header
    const addHeader = (title) => {
        // Top Bar
        doc.setFillColor(15, 23, 42); // Slate 900
        doc.rect(0, 0, pageWidth, 20, "F");

        // Title
        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.text("FullLoad 3D", 10, 13);

        doc.setFontSize(10);
        doc.setTextColor(203, 213, 225); // Slate 300
        doc.text(title, pageWidth - 10, 13, { align: "right" });

        // Reset
        doc.setTextColor(0, 0, 0);
    };

    // Helper: Footer
    const addFooter = (pageNumber) => {
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text(`Gerado em ${dateStr} - Página ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    };

    // ========================
    // PAGE 1: OVERVIEW
    // ========================
    addHeader("Relatório Geral de Carregamento");

    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text("Resumo da Carga", 14, 35);

    // Stats Grid
    const statsY = 45;

    // Box 1: Documento
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, statsY, 80, 25, 3, 3, "FD");
    doc.setFontSize(9); doc.text("Documento / Carga", 19, statsY + 8);
    doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.text(docInfo.documento || "N/A", 19, statsY + 18);

    // Box 2: Total Items
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(100, statsY, 40, 25, 3, 3, "FD");
    doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.text("Total Itens", 105, statsY + 8);
    doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.text(String(summary.totalItems), 105, statsY + 18);

    // Box 3: Total Weight
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(145, statsY, 40, 25, 3, 3, "FD");
    doc.setFontSize(9); doc.setTextColor(100, 116, 139); doc.text("Peso Total", 150, statsY + 8);
    doc.setFontSize(12); doc.setTextColor(15, 23, 42); doc.text(`${summary.totalWeight} kg`, 150, statsY + 18);

    // Overall Snapshot (Last step image represents full load)
    const fullImage = steps[steps.length - 1]?.image;
    if (fullImage) {
        doc.addImage(fullImage, "PNG", 14, 80, 180, 100);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("Visão Final da Carga", 105, 185, { align: "center" });
    }

    addFooter(1);

    // ========================
    // STEP PAGES
    // ========================

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        doc.addPage();
        addHeader(`Passo ${i + 1} de ${steps.length}`);

        // Title
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text(step.title, 14, 30);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`${step.items.length} itens neste passo`, 14, 36);

        // Image
        if (step.image) {
            // Image takes top half
            doc.addImage(step.image, "PNG", 14, 45, 180, 90);
        }

        // Table
        const tableData = step.items.map(item => [
            item.nome,
            item.dims,
            item.stop || "-",
            item.weight,
            "1"
        ]);

        autoTable(doc, {
            startY: 145,
            head: [["Item", "Dimensões", "Destino", "Peso (kg)", "Qtd"]],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [51, 65, 85] },
            styles: { fontSize: 8 },
        });

        addFooter(i + 2);
    }

    return doc.output("blob");
};
