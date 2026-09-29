"use client";

import { useRef } from "react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

interface Props {
  eventName: string;
  url: string;
}

export function PrintablePoster({ eventName, url }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 500, margin: 2 }).then(setQrDataUrl);
  }, [url]);

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <button
        onClick={handlePrint}
        className="mb-4 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 print:hidden transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        Print Poster
      </button>

      <div
        ref={printRef}
        className="bg-white text-white rounded-2xl p-10 text-center max-w-md mx-auto print:max-w-none print:rounded-none print:mx-0"
      >
        <p className="text-3xl font-bold mb-1">📸 SHARE YOUR MOMENTS</p>
        <p className="text-lg mb-6 text-slate-700">{eventName}</p>

        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- print layout, data URL
          <img src={qrDataUrl} alt="Scan to add a moment" className="mx-auto mb-6" />
        )}

        <p className="text-2xl font-semibold mb-4">Scan the QR code</p>
        <div className="text-lg space-y-1 text-slate-700">
          <p>Add a moment</p>
          <p>Upload it</p>
          <p>See the memories</p>
        </div>
      </div>
    </div>
  );
}
