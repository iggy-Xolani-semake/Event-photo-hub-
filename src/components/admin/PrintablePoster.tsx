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
        className="text-sm bg-white/10 border border-white/20 rounded-lg px-3 py-2 mb-4 print:hidden"
      >
        Print Poster
      </button>

      <div
        ref={printRef}
        className="bg-white text-ink-950 rounded-2xl p-10 text-center max-w-md mx-auto print:max-w-none print:rounded-none print:mx-0"
      >
        <p className="text-3xl font-bold mb-1">📸 SHARE YOUR MOMENTS</p>
        <p className="text-lg mb-6 text-ink-700">{eventName}</p>

        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- print layout, data URL
          <img src={qrDataUrl} alt="Scan to upload photos" className="mx-auto mb-6" />
        )}

        <p className="text-2xl font-semibold mb-4">Scan the QR code</p>
        <div className="text-lg space-y-1 text-ink-700">
          <p>Take a photo</p>
          <p>Upload it</p>
          <p>See the memories</p>
        </div>
      </div>
    </div>
  );
}
