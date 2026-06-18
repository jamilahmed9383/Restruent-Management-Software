import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { UtensilsCrossed, ArrowRight } from "lucide-react";

export default function Landing() {
  const { tableNumber } = useCart();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If no table param exists, set a mock one for preview purposes
    if (!tableNumber && !window.location.search.includes('table=')) {
        window.history.replaceState({}, '', '?table=12');
        // trigger reload to pick up query param in hook
        window.location.reload();
    }
  }, [tableNumber]);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: 'url("/images/burger.png")' }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 p-6 text-center text-white">
        <div className="w-20 h-20 bg-primary/20 backdrop-blur-md rounded-full flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
          <UtensilsCrossed className="w-10 h-10 text-primary-foreground" />
        </div>
        
        <h1 className="text-5xl font-serif font-bold tracking-tight mb-4 text-white">
          Lumina
        </h1>
        <p className="text-lg text-white/80 max-w-sm mb-12">
          A modern dining experience, crafted for your table.
        </p>

        {tableNumber ? (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-8 w-full max-w-sm shadow-xl">
            <p className="text-sm font-medium text-white/60 uppercase tracking-wider mb-1">
              You are seated at
            </p>
            <p className="text-4xl font-serif font-semibold text-white">
              Table {tableNumber}
            </p>
          </div>
        ) : (
          <div className="bg-destructive/20 backdrop-blur-md border border-destructive/50 text-destructive-foreground rounded-2xl p-6 mb-8 w-full max-w-sm shadow-xl">
            <p>Please scan the QR code on your table to start ordering.</p>
          </div>
        )}

        <Button 
          size="lg" 
          className="w-full max-w-sm h-14 text-lg rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_40px_-10px_hsl(var(--primary))]"
          onClick={() => setLocation("/menu")}
          disabled={!tableNumber}
        >
          Browse Menu <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
