import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { useCreateOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Trash2, Plus, Minus, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function Cart() {
  const { items, tableNumber, updateQuantity, removeItem, clearCart, subtotal, tax, total } = useCart();
  const [, setLocation] = useLocation();
  const [notes, setNotes] = useState("");
  const [successOrderId, setSuccessOrderId] = useState<number | null>(null);

  const createOrder = useCreateOrder();

  const handlePlaceOrder = () => {
    if (!tableNumber) return;
    
    createOrder.mutate({
      data: {
        tableNumber,
        items: items.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity
        })),
        notes: notes || undefined
      }
    }, {
      onSuccess: (order) => {
        setSuccessOrderId(order.id);
        clearCart();
      }
    });
  };

  if (items.length === 0 && !successOrderId) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <header className="px-4 py-4 flex items-center gap-3 border-b border-border">
          <Link href="/menu" className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-serif font-bold text-foreground">Your Cart</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Trash2 className="w-8 h-8 opacity-50" />
          </div>
          <h2 className="text-lg font-medium text-foreground mb-2">Your cart is empty</h2>
          <p className="text-sm mb-8 max-w-[250px]">Looks like you haven't added anything to your order yet.</p>
          <Button onClick={() => setLocation("/menu")} className="rounded-full px-8">
            Browse Menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pb-32">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href="/menu" className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-serif font-bold text-foreground">Review Order</h1>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <div className="flex flex-col gap-6">
          {/* Order Items */}
          <section className="flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4">
                <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden shrink-0">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-foreground leading-tight">{item.name}</h3>
                    <span className="font-medium ml-2">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-3 bg-secondary rounded-full p-1 h-9">
                      <button 
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-background text-muted-foreground"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-medium text-sm w-4 text-center">{item.quantity}</span>
                      <button 
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-background text-muted-foreground"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <Separator className="bg-border" />

          {/* Notes */}
          <section>
            <h3 className="font-medium text-foreground mb-3">Add a note (optional)</h3>
            <Textarea 
              placeholder="Any allergies or special requests?"
              className="resize-none bg-muted/50 border-none rounded-xl"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </section>

          <Separator className="bg-border" />

          {/* Summary */}
          <section className="flex flex-col gap-3">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax (10%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-foreground font-serif font-bold text-xl pt-2">
              <span>Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </section>
        </div>
      </main>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-40 pb-safe">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button 
            className="flex-1 rounded-full h-14 text-lg font-medium"
            onClick={handlePlaceOrder}
            disabled={createOrder.isPending || !tableNumber}
          >
            {createOrder.isPending ? "Placing..." : "Place Order"}
          </Button>
        </div>
      </div>

      {/* Success Modal */}
      <Dialog open={!!successOrderId} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8 text-center">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-center mb-2">Order Placed!</DialogTitle>
            <DialogDescription className="text-center text-base">
              Your order #{successOrderId} has been sent to the kitchen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-col gap-3 mt-6">
            <Button 
              className="w-full rounded-full h-12 text-base" 
              onClick={() => {
                setSuccessOrderId(null);
                setLocation("/queue");
              }}
            >
              View Queue Status
            </Button>
            <Button 
              variant="outline" 
              className="w-full rounded-full h-12 text-base border-none shadow-none text-muted-foreground hover:bg-muted"
              onClick={() => {
                setSuccessOrderId(null);
                setLocation("/menu");
              }}
            >
              Back to Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
