import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { captureSnapshot, getPlacedItems } from "../fullload3d/fullLoadEngine";

/**
 * Generates a PDF blob for the current load plan.
 * @param {Object} docInfo - Metadata for the document (documento, tipoCarga).
 * @returns {Promise<Blob>} - The generated PDF as a Blob.
 */
export const generatePDFBlob = async (docInfo = {}) => {
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const logoUrl = "/logo.png"; // Ensure this is accessible in public/

    // Helper to load image
    const loadImage = (src) => new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });

    const logoImg = await loadImage(logoUrl);

    // Helper to add header
    const addHeader = (title) => {
        // Logo
        if (logoImg) {
            doc.addImage(logoImg, "PNG", 10, 5, 15, 15);
        }

        // Title
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text("FullLoad 3D", 30, 12);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text("Relatório de Carga", 30, 17);

        // Doc Info (Right aligned)
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105); // Slate-600
        const dateStr = new Date().toLocaleString();
        doc.text(dateStr, pageWidth - 10, 10, { align: "right" });

        if (docInfo.documento) {
            doc.text(`Doc: ${docInfo.documento}`, pageWidth - 10, 15, { align: "right" });
        }
        if (docInfo.tipoCarga) {
            doc.text(`Tipo: ${docInfo.tipoCarga}`, pageWidth - 10, 20, { align: "right" });
        }

        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.line(10, 25, pageWidth - 10, 25);

        // Page Title
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.text(title, 10, 35);
    };

    // Capture Views
    const imgIso = captureSnapshot("iso");
    const imgTop = captureSnapshot("top");
    const imgSide = captureSnapshot("side");
    const imgBack = captureSnapshot("back");

    // Page 1: Isometric (Maximized)
    if (imgIso) {
        addHeader("Vista Isométrica");
        // Maximize image area: Start Y=40, Margin=10
        doc.addImage(imgIso, "PNG", 10, 40, pageWidth - 20, pageHeight - 50);
    }

    // Page 2: Top
    if (imgTop) {
        doc.addPage();
        addHeader("Vista Superior");
        doc.addImage(imgTop, "PNG", 10, 40, pageWidth - 20, pageHeight - 50);
    }

    // Page 3: Side
    if (imgSide) {
        doc.addPage();
        addHeader("Vista Lateral");
        doc.addImage(imgSide, "PNG", 10, 40, pageWidth - 20, pageHeight - 50);
    }

    // Page 4: Back
    if (imgBack) {
        doc.addPage();
        addHeader("Vista Traseira");
        doc.addImage(imgBack, "PNG", 10, 40, pageWidth - 20, pageHeight - 50);
    }

    // Page 5: Item List
    doc.addPage();
    addHeader("Lista de Itens");

    const items = getPlacedItems();
    const tableColumn = ["Item", "Dimensões (cm)", "Peso (kg)", "Qtd", "Total (kg)"];
    const itemsMap = {};

    items.forEach(item => {
        const name = item.meta?.nome || "Item";
        const dims = `${(item.scale[0] * 100).toFixed(0)}x${(item.scale[1] * 100).toFixed(0)}x${(item.scale[2] * 100).toFixed(0)}`;
        const weight = Number(item.meta?.peso || 0);
        const key = `${name}-${dims}-${weight}`;

        if (!itemsMap[key]) itemsMap[key] = { name, dims, weight, count: 0 };
        itemsMap[key].count++;
    });

    const tableRows = Object.values(itemsMap).map(i => [
        i.name,
        i.dims,
        i.weight.toFixed(1),
        i.count,
        (i.weight * i.count).toFixed(1)
    ]);

    // Add Total Row
    const totalWeight = items.reduce((acc, item) => acc + Number(item.meta?.peso || 0), 0);
    const totalCount = items.length;

    tableRows.push([
        { content: 'TOTAL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'right' } },
        { content: totalCount, styles: { fontStyle: 'bold' } },
        { content: totalWeight.toFixed(1), styles: { fontStyle: 'bold' } }
    ]);

    autoTable(doc, {
        startY: 40,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [234, 88, 12], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    return doc.output("blob");
};
