import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";

export type ExportHistoryRow = {
  createdAt: string;
  category: string;
  item: string;
  valueOrStatus: string;
  userName: string;
  remarks: string;
  photoUrls: string[];
};

type ExportOptions = {
  restaurantName: string;
  startDate: string;
  endDate: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function sanitizeCsvValue(value: string): string {
  const escaped = value.replaceAll('"', '""');
  return `"${escaped}"`;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function fileDate(value: string): string {
  return value.replaceAll("-", "");
}

export function exportHistoryAsCsv(
  rows: ExportHistoryRow[],
  options: ExportOptions,
): void {
  const header = [
    "Datum",
    "Tijd",
    "Categorie",
    "Item",
    "Waarde/Status",
    "Gebruiker",
    "Opmerking",
  ];

  const csvLines = [
    header.join(","),
    ...rows.map((row) =>
      [
        formatDate(row.createdAt),
        formatTime(row.createdAt),
        row.category,
        row.item,
        row.valueOrStatus,
        row.userName,
        row.remarks,
      ]
        .map((value) => sanitizeCsvValue(value ?? ""))
        .join(","),
    ),
  ];

  const csvContent = csvLines.join("\n");
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(
    blob,
    `haccp_registraties_${fileDate(options.startDate)}_${fileDate(options.endDate)}.csv`,
  );
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else resolve(null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

type AutoTableDoc = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

export async function exportHistoryAsPdf(
  rows: ExportHistoryRow[],
  options: ExportOptions,
  includePhotos: boolean,
): Promise<void> {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const margin = 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(options.restaurantName || "Restaurant", margin, 40);
  doc.setFontSize(14);
  doc.text("HACCP Registratielijst", margin, 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Periode: ${options.startDate} t/m ${options.endDate}`,
    margin,
    80,
  );

  const firstPhotoMap = new Map<string, string | null>();
  if (includePhotos) {
    await Promise.all(
      rows.map(async (row) => {
        const firstUrl = row.photoUrls[0];
        if (!firstUrl) {
          firstPhotoMap.set(row.createdAt + row.item + row.category, null);
          return;
        }
        const dataUrl = await loadImageDataUrl(firstUrl);
        firstPhotoMap.set(row.createdAt + row.item + row.category, dataUrl);
      }),
    );
  }

  const head = [
    [
      "Datum",
      "Tijd",
      "Categorie",
      "Item",
      "Waarde/Status",
      "Gebruiker",
      "Opmerking",
      ...(includePhotos ? ["Foto"] : []),
    ],
  ];

  const body = rows.map((row) => {
    const key = row.createdAt + row.item + row.category;
    const photoLabel =
      includePhotos && row.photoUrls.length > 1
        ? `+${row.photoUrls.length - 1}`
        : "";
    return [
      formatDate(row.createdAt),
      formatTime(row.createdAt),
      row.category,
      row.item,
      row.valueOrStatus,
      row.userName,
      row.remarks || "-",
      ...(includePhotos ? [photoLabel] : []),
      key,
    ];
  });

  autoTable(doc, {
    startY: 92,
    head,
    body: body.map((row) => row.slice(0, includePhotos ? 8 : 7)),
    styles: {
      fontSize: 8,
      cellPadding: 6,
      valign: "middle",
      textColor: [31, 41, 55],
      lineColor: [226, 232, 240],
      lineWidth: 0.6,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      minCellHeight: 28,
      halign: "left",
    },
    bodyStyles: {
      minCellHeight: includePhotos ? 56 : 32,
    },
    columnStyles: includePhotos
      ? {
          0: { cellWidth: 58 },
          1: { cellWidth: 44 },
          2: { cellWidth: 100 },
          3: { cellWidth: 100 },
          4: { cellWidth: 90 },
          5: { cellWidth: 90 },
          6: { cellWidth: 130 },
          7: { cellWidth: 70, halign: "center" },
        }
      : {
          0: { cellWidth: 64 },
          1: { cellWidth: 48 },
          2: { cellWidth: 120 },
          3: { cellWidth: 120 },
          4: { cellWidth: 100 },
          5: { cellWidth: 100 },
          6: { cellWidth: 170 },
        },
    didDrawCell: (data) => {
      if (!includePhotos) return;
      if (data.section !== "body") return;
      if (data.column.index !== 7) return;
      const rowIndex = data.row.index;
      const lookup = body[rowIndex]?.[8];
      if (!lookup || typeof lookup !== "string") return;
      const img = firstPhotoMap.get(lookup);
      if (!img) return;

      const width = 40;
      const height = 40;
      const x = data.cell.x + (data.cell.width - width) / 2;
      const y = data.cell.y + (data.cell.height - height) / 2;
      doc.addImage(img, "JPEG", x, y, width, height);
    },
  });

  const finalY = (doc as AutoTableDoc).lastAutoTable?.finalY ?? 110;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Totaal registraties: ${rows.length}`,
    margin,
    Math.min(finalY + 18, doc.internal.pageSize.getHeight() - 18),
  );

  doc.save(
    `haccp_registraties_${fileDate(options.startDate)}_${fileDate(options.endDate)}.pdf`,
  );
}
