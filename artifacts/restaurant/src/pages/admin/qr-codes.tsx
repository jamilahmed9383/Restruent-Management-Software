import { useState, useRef } from "react";
import { Printer, Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRTableCardProps {
  tableNumber: number;
  appUrl: string;
}

function QRTableCard({ tableNumber, appUrl }: QRTableCardProps) {
  const url = `${appUrl}?table=${tableNumber}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(url)}`;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=20&data=${encodeURIComponent(url)}`;
    link.download = `table-${tableNumber}-qr.png`;
    link.target = "_blank";
    link.click();
  };

  return (
    <div className="qr-card bg-white border border-border rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm">
      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
        <span className="font-serif font-bold text-primary text-sm">T{tableNumber}</span>
      </div>
      <img
        src={qrSrc}
        alt={`QR code for Table ${tableNumber}`}
        className="w-40 h-40 rounded-lg"
        loading="lazy"
      />
      <div className="text-center">
        <p className="font-serif font-bold text-foreground">Table {tableNumber}</p>
        <p className="text-xs text-muted-foreground mt-0.5 break-all max-w-[160px]">{url}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-xl text-xs no-print"
        onClick={handleDownload}
      >
        <Download className="w-3 h-3 mr-1.5" />
        Download
      </Button>
    </div>
  );
}

export default function QRCodesTab() {
  const [tableCount, setTableCount] = useState(10);
  const [inputValue, setInputValue] = useState("10");
  const printRef = useRef<HTMLDivElement>(null);

  const appUrl = `${window.location.protocol}//${window.location.host}`;
  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  const handlePrint = () => {
    window.print();
  };

  const handleCountChange = (val: string) => {
    setInputValue(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= 100) {
      setTableCount(n);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="bg-background border border-border rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <QrCode className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-serif font-bold text-lg">QR Code Generator</h2>
          </div>
          <p className="text-sm text-muted-foreground pl-11">
            Each QR code links directly to the menu for that table. Print and laminate them.
          </p>
        </div>
        <div className="flex items-center gap-3 pl-11 sm:pl-0">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">Number of tables:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={inputValue}
              onChange={(e) => handleCountChange(e.target.value)}
              className="w-20 h-10 px-3 rounded-xl border border-border bg-muted/50 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Button onClick={handlePrint} className="rounded-xl h-10">
            <Printer className="w-4 h-4 mr-2" />
            Print All
          </Button>
        </div>
      </div>

      {/* Print header — only visible when printing */}
      <div className="hidden print-only text-center mb-4">
        <h1 className="text-2xl font-bold">Lumina — Table QR Codes</h1>
        <p className="text-sm text-gray-500 mt-1">Scan to view the menu and place your order</p>
      </div>

      {/* QR Grid */}
      <div ref={printRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {tables.map((n) => (
          <QRTableCard key={n} tableNumber={n} appUrl={appUrl} />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center no-print">
        Each QR code encodes: <span className="font-mono">{appUrl}?table=N</span>
      </p>
    </div>
  );
}
