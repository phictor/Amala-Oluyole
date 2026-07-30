/**
 * pdf-generator.ts
 *
 * Shared utility for generating branded PDF reports using expo-print.
 * Produces A4 HTML documents with:
 *   - Amala Oluyole branded header (deep purple + red accent)
 *   - Justified body text
 *   - Styled tables with alternating row colours
 *   - Summary stat boxes
 *   - Footer with page number and generation timestamp
 *
 * Usage:
 *   import { generatePdf, PdfSection } from "@/lib/pdf-generator";
 *   const sections: PdfSection[] = [ ... ];
 *   await generatePdf({ title: "Transaction Report", sections });
 */
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Platform, Alert } from "react-native";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const BRAND = {
  primary: "#201060",   // deep purple
  accent: "#D02010",    // Amala red
  light: "#F5F3FF",     // light purple tint
  muted: "#6B6490",
  border: "#D8D4EE",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
};

// ── Section types ─────────────────────────────────────────────────────────────
export type StatBox = {
  label: string;
  value: string | number;
  color?: string;
};

export type TableSection = {
  type: "table";
  title?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  colWidths?: string[]; // e.g. ["20%", "30%", "25%", "25%"]
};

export type StatBoxSection = {
  type: "stats";
  title?: string;
  stats: StatBox[];
};

export type TextSection = {
  type: "text";
  title?: string;
  body: string;
};

export type SpacerSection = {
  type: "spacer";
  height?: number;
};

export type PdfSection = TableSection | StatBoxSection | TextSection | SpacerSection;

export type PdfOptions = {
  title: string;
  subtitle?: string;
  dateRange?: string;
  sections: PdfSection[];
  filename?: string;
};

// ── HTML builders ─────────────────────────────────────────────────────────────
function esc(v: string | number | null | undefined): string {
  if (v == null) return "—";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildStatBoxes(stats: StatBox[]): string {
  const boxes = stats.map(s => `
    <div style="
      flex: 1; min-width: 120px; background: ${BRAND.light};
      border-radius: 8px; padding: 12px 10px; text-align: center;
      border-top: 3px solid ${s.color ?? BRAND.primary};
      margin: 4px;
    ">
      <div style="font-size: 22px; font-weight: 800; color: ${s.color ?? BRAND.primary}; margin-bottom: 4px;">
        ${esc(s.value)}
      </div>
      <div style="font-size: 11px; color: ${BRAND.muted}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
        ${esc(s.label)}
      </div>
    </div>
  `).join("");
  return `<div style="display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0;">${boxes}</div>`;
}

function buildTable(section: TableSection): string {
  const widths = section.colWidths ?? [];
  const headerCells = section.headers.map((h, i) =>
    `<th style="width:${widths[i] ?? "auto"}; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #fff;">${esc(h)}</th>`
  ).join("");

  const bodyRows = section.rows.map((row, ri) => {
    const bg = ri % 2 === 0 ? "#fff" : BRAND.light;
    const cells = row.map((cell, ci) =>
      `<td style="width:${widths[ci] ?? "auto"}; padding: 7px 10px; font-size: 12px; color: #1a1640; border-bottom: 1px solid ${BRAND.border};">${esc(cell)}</td>`
    ).join("");
    return `<tr style="background: ${bg};">${cells}</tr>`;
  }).join("");

  const titleHtml = section.title
    ? `<h3 style="font-size: 13px; font-weight: 700; color: ${BRAND.primary}; margin: 16px 0 8px;">${esc(section.title)}</h3>`
    : "";

  return `
    ${titleHtml}
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-family: Helvetica, Arial, sans-serif;">
      <thead>
        <tr style="background: ${BRAND.primary};">${headerCells}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

function buildSection(section: PdfSection): string {
  switch (section.type) {
    case "stats": {
      const titleHtml = section.title
        ? `<h3 style="font-size: 13px; font-weight: 700; color: ${BRAND.primary}; margin: 16px 0 8px;">${esc(section.title)}</h3>`
        : "";
      return titleHtml + buildStatBoxes(section.stats);
    }
    case "table":
      return buildTable(section);
    case "text": {
      const titleHtml = section.title
        ? `<h3 style="font-size: 13px; font-weight: 700; color: ${BRAND.primary}; margin: 16px 0 8px;">${esc(section.title)}</h3>`
        : "";
      return `${titleHtml}<p style="font-size: 12px; color: #1a1640; line-height: 1.7; text-align: justify; margin-bottom: 12px;">${section.body}</p>`;
    }
    case "spacer":
      return `<div style="height: ${section.height ?? 16}px;"></div>`;
    default:
      return "";
  }
}

function buildHtml(opts: PdfOptions): string {
  const now = new Date().toLocaleString("en-NG", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const sectionsHtml = opts.sections.map(buildSection).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(opts.title)}</title>
  <style>
    @page { margin: 24px 28px; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Helvetica, Arial, sans-serif;
      color: #1a1640;
      background: #fff;
      font-size: 13px;
      line-height: 1.5;
    }
    h1, h2, h3 { font-family: Helvetica, Arial, sans-serif; }
    p { text-align: justify; }
    table { border-collapse: collapse; }
    thead tr th { background: ${BRAND.primary}; color: #fff; }
  </style>
</head>
<body>
  <!-- ── Branded Header ── -->
  <div style="
    background: linear-gradient(135deg, ${BRAND.primary} 0%, #3a2080 100%);
    padding: 20px 24px 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    position: relative;
    overflow: hidden;
  ">
    <div style="
      position: absolute; top: -20px; right: -20px;
      width: 80px; height: 80px; border-radius: 50%;
      background: ${BRAND.accent}; opacity: 0.25;
    "></div>
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
      <div style="
        width: 36px; height: 36px; border-radius: 8px;
        background: ${BRAND.accent}; display: flex; align-items: center; justify-content: center;
      ">
        <span style="color: #fff; font-size: 18px; font-weight: 900;">A</span>
      </div>
      <div>
        <div style="color: #fff; font-size: 18px; font-weight: 800; letter-spacing: 0.3px;">Amala Oluyole</div>
        <div style="color: rgba(255,255,255,0.65); font-size: 11px;">Restaurant Management System</div>
      </div>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px; margin-top: 4px;">
      <div style="color: #fff; font-size: 20px; font-weight: 800;">${esc(opts.title)}</div>
      ${opts.subtitle ? `<div style="color: rgba(255,255,255,0.75); font-size: 12px; margin-top: 2px;">${esc(opts.subtitle)}</div>` : ""}
      ${opts.dateRange ? `<div style="color: rgba(255,255,255,0.65); font-size: 11px; margin-top: 4px;">Period: ${esc(opts.dateRange)}</div>` : ""}
    </div>
  </div>

  <!-- ── Content ── -->
  <div style="padding: 0 4px;">
    ${sectionsHtml}
  </div>

  <!-- ── Footer ── -->
  <div style="
    margin-top: 24px; padding-top: 12px;
    border-top: 2px solid ${BRAND.border};
    display: flex; justify-content: space-between; align-items: center;
  ">
    <div style="font-size: 10px; color: ${BRAND.muted};">
      Generated: ${now}
    </div>
    <div style="font-size: 10px; color: ${BRAND.muted}; font-style: italic;">
      Amala Oluyole Restaurant — Confidential
    </div>
  </div>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Generate a PDF from the given options and share/download it.
 * - On native: generates a PDF file and opens the system share sheet.
 * - On web: opens the browser's print dialog (expo-print limitation on web).
 */
export async function generatePdf(opts: PdfOptions): Promise<void> {
  const html = buildHtml(opts);
  const filename = opts.filename ?? opts.title.replace(/\s+/g, "_").toLowerCase();

  try {
    if (Platform.OS === "web") {
      // On web, open a new window with the HTML content and trigger print
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 500);
      }
      return;
    }

    // Native: generate PDF file then share
    const { uri } = await Print.printToFileAsync({
      html,
      margins: { top: 24, left: 28, right: 28, bottom: 24 },
    });

    // Move to a named file in the document directory
    const destUri = `${FileSystem.documentDirectory}${filename}_${Date.now()}.pdf`;
    await FileSystem.moveAsync({ from: uri, to: destUri });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(destUri, {
        mimeType: "application/pdf",
        dialogTitle: `Share ${opts.title}`,
        UTI: "com.adobe.pdf",
      });
    } else {
      Alert.alert("PDF Saved", `Report saved to:\n${destUri}`);
    }
  } catch (err) {
    console.error("[PDF] generatePdf error:", err);
    Alert.alert("Export Failed", "Could not generate the PDF report. Please try again.");
  }
}
