import { useState, useEffect } from "react";
import { Printer, Download, QrCode, Plus, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "lumina-qr-tables";

interface QRTableCardProps {
  tableNumber: number;
  appUrl: string;
  onRemove: (n: number) => void;
}

function QRTableCard({ tableNumber, appUrl, onRemove }: QRTableCardProps) {
  const url = `${appUrl}?table=${tableNumber}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(url)}`;
  const qrHiRes = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=20&data=${encodeURIComponent(url)}`;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = qrHiRes;
    link.download = `table-${tableNumber}-qr.png`;
    link.target = "_blank";
    link.click();
  };

  return (
    <div className="qr-card bg-white border border-border rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm relative group">
      <button
        onClick={() => onRemove(tableNumber)}
        className="no-print absolute top-3 right-3 w-6 h-6 rounded-full bg-muted hover:bg-destructive hover:text-destructive-foreground text-muted-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        title="Remove table"
      >
        <X className="w-3 h-3" />
      </button>
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
  const [tables, setTables] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");

  const appUrl = `${window.location.protocol}//${window.location.host}`;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
  }, [tables]);

  const handleAdd = () => {
    const num = parseInt(inputValue.trim(), 10);
    if (isNaN(num) || num < 1 || num > 999) {
      setError("Enter a valid table number (1–999)");
      return;
    }
    if (tables.includes(num)) {
      setError(`Table ${num} is already added`);
      return;
    }
    setTables(prev => [...prev, num].sort((a, b) => a - b));
    setInputValue("");
    setError("");
  };

  const handleRemove = (n: number) => {
    setTables(prev => prev.filter(t => t !== n));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAdd();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Add Table Control */}
      <div className="bg-background border border-border rounded-3xl p-6 shadow-sm no-print">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <QrCode className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-lg">QR Code Generator</h2>
            <p className="text-xs text-muted-foreground">Add tables to generate their QR codes. Codes are saved until you remove them.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-sm font-medium text-foreground">Table Number</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={999}
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setError(""); }}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 7"
                className="flex-1 h-11 px-4 rounded-xl border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
              />
              <Button onClick={handleAdd} className="h-11 px-5 rounded-xl shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Table
              </Button>
            </div>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
          </div>

          {tables.length > 0 && (
            <div className="flex gap-2 shrink-0 pb-px">
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print All ({tables.length})
              </Button>
              <Button
                variant="ghost"
                className="h-11 rounded-xl text-muted-foreground hover:text-destructive"
                onClick={() => { setTables([]); }}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* QR Grid */}
      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <QrCode className="w-12 h-12 opacity-20" />
          <p className="font-medium">No tables added yet</p>
          <p className="text-sm">Enter a table number above and click Add Table</p>
        </div>
      ) : (
        <>
          <div className="print-only hidden text-center mb-2">
            <h1 className="text-xl font-bold">Lumina — Table QR Codes</h1>
            <p className="text-sm text-gray-500">Scan to view the menu and place your order</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {tables.map((n) => (
              <QRTableCard key={n} tableNumber={n} appUrl={appUrl} onRemove={handleRemove} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center no-print">
            Hover over a card to remove it · QR codes encode: <span className="font-mono">{appUrl}?table=N</span>
          </p>
        </>
      )}
    </div>
  );
}
