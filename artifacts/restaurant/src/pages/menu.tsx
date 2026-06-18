import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { useListMenuItems, useListCategories, getListMenuItemsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, ShoppingBag, Plus, Minus, ArrowLeft, UtensilsCrossed, Moon, Sun } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";

export default function Menu() {
  const { items, totalItems, total, addItem, updateQuantity, tableNumber } = useCart();
  const [, setLocation] = useLocation();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories, isLoading: isLoadingCategories } = useListCategories();
  
  const menuParams = { category: activeCategory !== "All" ? activeCategory : undefined, search: searchQuery || undefined };
  const { data: menuItems, isLoading: isLoadingMenu } = useListMenuItems(
    menuParams,
    { query: { queryKey: getListMenuItemsQueryKey(menuParams) } }
  );

  const { theme, setTheme } = useTheme();

  const getQuantity = (id: number) => {
    return items.find((i) => i.id === id)?.quantity || 0;
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-serif font-bold text-foreground">Menu</h1>
              {tableNumber && (
                <p className="text-xs text-muted-foreground">Table {tableNumber}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                type="search"
                placeholder="Search..." 
                className="pl-9 h-9 w-32 md:w-48 bg-muted border-none rounded-full text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex px-4 pb-4 gap-2">
            <Button
              variant={activeCategory === "All" ? "default" : "secondary"}
              className="rounded-full h-8 px-4 text-xs font-medium"
              onClick={() => setActiveCategory("All")}
            >
              All
            </Button>
            {isLoadingCategories ? (
              Array(4).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-full" />
              ))
            ) : (
              categories?.map((cat) => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? "default" : "secondary"}
                  className="rounded-full h-8 px-4 text-xs font-medium"
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </Button>
              ))
            )}
          </div>
          <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
      </header>

      {/* Menu Grid */}
      <main className="p-4">
        {isLoadingMenu ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="w-full aspect-[4/3] rounded-2xl" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))}
          </div>
        ) : menuItems?.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center">
            <UtensilsCrossed className="w-12 h-12 mb-4 opacity-20" />
            <p>No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems?.map((item) => {
              const qty = getQuantity(item.id);
              return (
                <div key={item.id} className="flex flex-col group">
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-3 bg-muted">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-10">
                        <ShoppingBag className="w-10 h-10" />
                      </div>
                    )}
                    {item.isSpecial && (
                      <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border-none">
                        Special
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h3 className="font-serif font-bold text-lg leading-tight text-foreground">{item.name}</h3>
                    <span className="font-medium text-primary whitespace-nowrap">${item.price.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                    {item.description}
                  </p>
                  
                  <div className="mt-auto">
                    {qty > 0 ? (
                      <div className="flex items-center justify-between bg-secondary rounded-full p-1 h-10">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full hover:bg-background"
                          onClick={() => updateQuantity(item.id, qty - 1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="font-medium w-8 text-center">{qty}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-full hover:bg-background"
                          onClick={() => updateQuantity(item.id, qty + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="secondary"
                        className="w-full rounded-full h-10 font-medium"
                        onClick={() => addItem(item)}
                        disabled={!item.available}
                      >
                        {item.available ? "Add to Cart" : "Sold Out"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky Cart Fab */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-4 z-50 flex justify-center pointer-events-none">
          <Button 
            className="rounded-full h-14 px-6 shadow-2xl bg-foreground text-background hover:bg-foreground/90 w-full max-w-sm flex items-center justify-between pointer-events-auto"
            onClick={() => setLocation("/cart")}
          >
            <div className="flex items-center gap-3">
              <div className="bg-background/20 text-background rounded-full w-8 h-8 flex items-center justify-center font-medium text-sm">
                {totalItems}
              </div>
              <span className="font-medium">View Cart</span>
            </div>
            <span className="font-medium">${total.toFixed(2)}</span>
          </Button>
        </div>
      )}
    </div>
  );
}

