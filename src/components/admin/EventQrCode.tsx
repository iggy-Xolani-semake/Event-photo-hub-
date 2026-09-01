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
          className="text-sm bg-white/10 border border-white/20 rounded-lg px-3 py-2"
        >
          Download PNG
        </button>
        <button
          onClick={downloadSvg}
          disabled={!svgString}
          className="text-sm bg-white/10 border border-white/20 rounded-lg px-3 py-2 disabled:opacity-50"
        >
          Download SVG
        </button>
      </div>
    </div>
  );
}
