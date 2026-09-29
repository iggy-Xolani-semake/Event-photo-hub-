"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface Props {
  url: string;
  size?: number;
}

export function EventQrCode({ url, size = 280 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [svgString, setSvgString] = useState<string | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: { dark: "#0a0a0c", light: "#ffffff" },
      });
    }
    QRCode.toString(url, { type: "svg", margin: 2 }).then(setSvgString);
  }, [url, size]);

  function downloadPng() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "event-qr-code.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  function downloadSvg() {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url2 = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "event-qr-code.svg";
    link.href = url2;
    link.click();
    URL.revokeObjectURL(url2);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white rounded-2xl p-4">
        <canvas ref={canvasRef} />
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={downloadPng}
          className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          Download PNG
        </button>
        <button
          onClick={downloadSvg}
          disabled={!svgString}
          className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 disabled:opacity-50 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          Download SVG
        </button>
      </div>
    </div>
  );
}
