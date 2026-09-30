"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";

interface Props {
  eventName: string;
  url: string;
}

const INSTRUCTIONS = [
  ["01", "Scan the QR Code", "Open your phone camera and point it at the code."],
  ["02", "Upload your photos", "No app download or sign-up needed."],
  ["03", "View & share", "Enjoy the live event gallery together."],
] as const;

function getCode(url: string) {
  try { return new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? ""; }
  catch { return url.split("/").filter(Boolean).at(-1) ?? ""; }
}

export function PrintablePoster({ eventName, url }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const eventCode = getCode(url);
  let fallbackLink = url;
  try { const parsed = new URL(url); fallbackLink = `${parsed.host}${parsed.pathname}`; } catch { /* Keep the supplied URL. */ }

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 900, margin: 1, errorCorrectionLevel: "H", color: { dark: "#111827", light: "#ffffff" } })
      .then((data) => { if (active) setQrDataUrl(data); })
      .catch((error) => console.error("Could not generate poster QR code", error));
    return () => { active = false; };
  }, [url]);

  useEffect(() => {
    const afterPrint = () => { setPrinting(false); document.body.classList.remove("print-poster-mode"); };
    window.addEventListener("afterprint", afterPrint);
    return () => window.removeEventListener("afterprint", afterPrint);
  }, []);

  function handlePrint() {
    setPrinting(true);
    document.body.classList.add("print-poster-mode");
    window.setTimeout(() => window.print(), 80);
  }

  async function handlePdfDownload() {
    if (!qrDataUrl) return;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const width = 210;
    const margin = 15;
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, 210, 297, "F");
    pdf.setDrawColor(221, 214, 254);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(9, 9, 192, 279, 5, 5, "S");

    pdf.setTextColor(109, 40, 217);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(21);
    pdf.text("shutaMzala", width / 2, 25, { align: "center" });
    pdf.setTextColor(71, 85, 105);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text("EVERY GUEST PHOTO, TOGETHER", width / 2, 32, { align: "center" });

    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    const titleLines = pdf.splitTextToSize(eventName, width - margin * 2);
    pdf.text(titleLines, width / 2, 47, { align: "center", lineHeightFactor: 1.15 });
    const headlineY = 47 + titleLines.length * 10 + 4;
    pdf.setTextColor(109, 40, 217);
    pdf.setFontSize(12);
    pdf.text("SHARE YOUR BEST MOMENTS WITH US", width / 2, headlineY, { align: "center" });

    const qrSize = 78;
    const qrY = headlineY + 9;
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect((width - qrSize - 12) / 2, qrY - 6, qrSize + 12, qrSize + 12, 4, 4, "FD");
    pdf.addImage(qrDataUrl, "PNG", (width - qrSize) / 2, qrY, qrSize, qrSize, undefined, "FAST");

    const instructionsY = qrY + qrSize + 15;
    const columnWidth = 58;
    INSTRUCTIONS.forEach(([number, title, description], index) => {
      const x = margin + index * (columnWidth + 5);
      pdf.setFillColor(245, 243, 255);
      pdf.circle(x + 4, instructionsY, 4, "F");
      pdf.setTextColor(109, 40, 217);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text(number, x + 4, instructionsY + 1, { align: "center" });
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(10);
      pdf.text(title, x, instructionsY + 11);
      pdf.setTextColor(71, 85, 105);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(pdf.splitTextToSize(description, columnWidth), x, instructionsY + 17, { lineHeightFactor: 1.35 });
    });

    const linkY = instructionsY + 45;
    pdf.setDrawColor(221, 214, 254);
    pdf.line(30, linkY, 180, linkY);
    pdf.setTextColor(71, 85, 105);
    pdf.setFontSize(9);
    pdf.text("CAN'T SCAN? TYPE THIS LINK", width / 2, linkY + 9, { align: "center" });
    pdf.setTextColor(109, 40, 217);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(pdf.splitTextToSize(fallbackLink, width - margin * 2), width / 2, linkY + 18, { align: "center" });
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(9);
    pdf.text(`EVENT CODE  ${eventCode}`, width / 2, linkY + 31, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text("Thanks for helping us capture the day!", width / 2, 277, { align: "center" });

    const safeName = eventName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "event";
    pdf.save(`shutamzala-${safeName}-poster.pdf`);
  }

  return (
    <div className={printing ? "poster-print-mode" : ""}>
      <div className="mb-4 flex flex-wrap gap-2 poster-controls print:hidden">
        <button onClick={handlePrint} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30">
          <Printer className="h-4 w-4" /> Print Poster
        </button>
        <button onClick={handlePdfDownload} disabled={!qrDataUrl} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100 disabled:cursor-wait disabled:opacity-50">
          <Download className="h-4 w-4" /> Download Poster as PDF
        </button>
      </div>

      <div ref={printRef} className="poster-print-root mx-auto w-full max-w-md rounded-2xl border border-violet-100 bg-white px-7 py-8 text-center text-slate-900 shadow-sm sm:px-10 sm:py-9">
        <div className="mx-auto mb-5 inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-extrabold tracking-tight text-violet-700">shutaMzala</div>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">{eventName}</h1>
        <p className="mt-3 text-sm font-bold uppercase tracking-[0.12em] text-violet-700">Share your best moments with us</p>
        <div className="mx-auto my-6 flex w-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- QR data URL is generated client-side at print resolution.
            <img src={qrDataUrl} alt={`QR code to upload photos to ${eventName}`} className="h-56 w-56 sm:h-64 sm:w-64" />
          ) : <div className="h-56 w-56 animate-pulse rounded-lg bg-slate-100 sm:h-64 sm:w-64" aria-label="Preparing QR code" />}
        </div>
        <ol className="mx-auto grid max-w-sm gap-3 text-left">
          {INSTRUCTIONS.map(([number, title, description]) => <li key={number} className="flex gap-3 rounded-xl bg-slate-50 p-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{number}</span>
            <span><strong className="block text-sm text-slate-900">{title}</strong><span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{description}</span></span>
          </li>)}
        </ol>
        <div className="mt-6 border-t border-slate-200 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Can’t scan? Visit</p>
          <p className="mt-1 break-all text-sm font-bold text-violet-700">{fallbackLink}</p>
          <p className="mt-2 text-xs text-slate-600">Event code: <strong className="tracking-widest text-slate-900">{eventCode}</strong></p>
        </div>
        <p className="mt-5 text-xs font-medium text-slate-500">Thank you for helping us capture the day ✨</p>
      </div>
    </div>
  );
}
