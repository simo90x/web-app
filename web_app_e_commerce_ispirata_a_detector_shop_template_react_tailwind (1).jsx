import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import {
  ShoppingCart,
  Search,
  Heart,
  Menu,
  Star,
  ChevronRight,
  ChevronDown,
  Filter,
  X,
  Truck,
  ShieldCheck,
  RefreshCw,
  Flame,
  Beef,
  Utensils,
  Trees,
  BadgePercent,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * BRACIARTE — Template e‑commerce per barbecue artigianali, griglie inox,
 * taglieri in legno e accessori outdoor.
 *
 * ⚠️ Integra con un backend:
 *  - GET  /api/products          -> lista prodotti
 *  - POST /api/checkout          -> { items: [{id, qty}], customer?:{...} } => { sessionId }
 *  - GET  /api/me (opzionale)    -> dati utente
 *
 * Stripe Checkout:
 *  - Imposta NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY nel frontend
 *  - L'endpoint /api/checkout crea una Checkout Session e restituisce sessionId
 *  - Qui usiamo stripe.redirectToCheckout({ sessionId })
 */

// ------------------
// CATEGORIE
// ------------------
const CATEGORIES = [
  { key: "bbq", label: "Barbecue artigianali", icon: Flame },
  { key: "griglie", label: "Griglie inox", icon: Utensils },
  { key: "taglieri", label: "Taglieri in legno", icon: Beef },
  { key: "outdoor", label: "Outdoor & accessori", icon: Trees },
];

// ------------------
// IMMAGINI PLACEHOLDER (Unsplash) — sostituiscile con le tue foto
// ------------------
const PLACE = {
  bbq: "https://images.unsplash.com/photo-1514517521153-1be72277b32e?q=80&w=1600&auto=format&fit=crop",
  grill: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?q=80&w=1600&auto=format&fit=crop",
  board: "https://images.unsplash.com/photo-1519092796169-bbbba7f9f62c?q=80&w=1600&auto=format&fit=crop",
  outdoor: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop",
};

// ------------------
// MOCK DATA (fallback se il backend non risponde)
// ------------------
const FALLBACK_PRODUCTS = [
  {
    id: "bbq1",
    title: "Barbecue a legna BraciArte 60",
    category: "bbq",
    price: 799,
    rating: 4.8,
    reviews: 64,
    badge: "Artigianale",
    image: PLACE.bbq,
    highlights: ["Acciaio Corten 3mm", "Piano cottura 60cm", "Made in Italy"],
    stock: 5,
    shipping: "3-5 gg",
  },
  {
    id: "gr1",
    title: "Griglia inox 304 Premium 45×35",
    category: "griglie",
    price: 139,
    rating: 4.6,
    reviews: 112,
    badge: "-10%",
    image: PLACE.grill,
    highlights: ["Alette anti‑aderenza", "Manici removibili", "Lavastoviglie ok"],
    stock: 18,
    shipping: "24/48h",
  },
  {
    id: "tg1",
    title: "Tagliere in noce massello XL",
    category: "taglieri",
    price: 89,
    rating: 4.7,
    reviews: 203,
    badge: "Bestseller",
    image: PLACE.board,
    highlights: ["Finitura olio minerale", "Canalina succhi", "34×50cm"],
    stock: 11,
    shipping: "24/48h",
  },
  {
    id: "od1",
    title: "Set utensili BBQ 5 pezzi",
    category: "outdoor",
    price: 49,
    rating: 4.3,
    reviews: 57,
    badge: null,
    image: PLACE.outdoor,
    highlights: ["Acciaio inox", "Custodia inclusa", "Gancio magnetico"],
    stock: 26,
    shipping: "24/48h",
  },
];

// ------------------
// UTIL
// ------------------
const currency = (n) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

function Stars({ value }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < full ? "fill-current" : half && i === full ? "fill-current" : ""
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

// ------------------
// API CLIENT (minimo)
// ------------------
async function fetchProducts() {
  try {
    const r = await fetch("/api/products", { cache: "no-store" });
    if (!r.ok) throw new Error("bad status");
    return await r.json();
  } catch (e) {
    return FALLBACK_PRODUCTS;
  }
}

async function createCheckout(items) {
  // items: [{id, qty}]
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || (window && window.__STRIPE_PK__);
  if (!key) throw new Error("Stripe publishable key mancante");
  const stripe = await loadStripe(key);
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("Checkout API error");
  const { sessionId } = await res.json();
  const { error } = await stripe.redirectToCheckout({ sessionId });
  if (error) throw error;
}

// ------------------
// COMPONENTI
// ------------------
function Topbar() {
  return (
    <div className="bg-primary text-primary-foreground text-xs py-2">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-4 w-4" /> Spedizione gratuita da 99€
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" /> Pagamenti sicuri
          </div>
          <div className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" /> Reso 30 giorni
          </div>
          <div className="hidden md:flex items-center gap-1">
            <Sun className="h-4 w-4" /> Supporto 7/7
          </div>
        </div>
      </div>
    </div>
  );
}

function Navbar({ onSearch, cartCount }) {
  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-2xl">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72">
            <DropdownMenuLabel>Categorie</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {CATEGORIES.map((c) => (
              <DropdownMenuItem key={c.key} className="flex items-center gap-2">
                <c.icon className="h-4 w-4" /> {c.label} <ChevronRight className="ml-auto h-4 w-4" />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <a className="font-bold text-2xl tracking-tight">BraciArte</a>

        <div className="ml-auto hidden md:flex items-center gap-2 w-full max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Cerca barbecue, griglie, taglieri..."
              className="pl-9 rounded-2xl"
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-2xl">
                  <Heart className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preferiti</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="default" className="rounded-2xl">
                <ShoppingCart className="mr-2 h-4 w-4" /> Carrello
                {cartCount > 0 && (
                  <Badge className="ml-2 rounded-xl" variant="secondary">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <CartSheet />
          </Sheet>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-rose-900 to-amber-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl font-extrabold leading-tight"
          >
            Barbecue artigianali per veri maestri del fuoco
          </motion.h1>
          <p className="mt-4 text-slate-200 max-w-lg">
            Griglie in acciaio inox, taglieri in legno massello e accessori outdoor selezionati. Progettati per durare, pensati per convivere.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" className="rounded-2xl">Scopri i barbecue</Button>
            <Button size="lg" variant="secondary" className="rounded-2xl">
              <BadgePercent className="mr-2 h-4 w-4" /> Offerte del weekend
            </Button>
          </div>
          <div className="mt-6 flex items-center gap-5 text-sm text-slate-200/90">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Garanzia 2 anni
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" /> Spedizione 24/48h
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Reso facile
            </div>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative"
        >
          <img
            alt="Hero"
            className="rounded-3xl shadow-2xl w-full object-cover h-[360px]"
            src={PLACE.bbq}
          />
          <div className="absolute -bottom-6 -left-6 bg-white text-slate-900 rounded-2xl shadow-xl p-4 flex items-center gap-3">
            <Star className="h-5 w-5" /> 4.8/5 dai nostri clienti
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Filters({ selectedCategory, setSelectedCategory, sort, setSort, query }) {
  return (
    <div className="flex items-center justify-between gap-3 py-4">
      <div className="flex items-center gap-2 overflow-x-auto">
        <Button
          variant={!selectedCategory ? "default" : "outline"}
          onClick={() => setSelectedCategory(null)}
          className="rounded-2xl"
        >
          Tutto
        </Button>
        {CATEGORIES.map((c) => (
          <Button
            key={c.key}
            variant={selectedCategory === c.key ? "default" : "outline"}
            onClick={() => setSelectedCategory(c.key)}
            className="rounded-2xl"
          >
            <c.icon className="mr-2 h-4 w-4" /> {c.label}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="rounded-2xl hidden sm:inline-flex">
          <Filter className="h-4 w-4 mr-1" /> Filtri smart attivi
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-2xl">
              Ordina <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {[
              { key: "relevance", label: "Rilevanza" },
              { key: "price_asc", label: "Prezzo crescente" },
              { key: "price_desc", label: "Prezzo decrescente" },
              { key: "rating_desc", label: "Miglior valutazione" },
            ].map((o) => (
              <DropdownMenuItem key={o.key} onClick={() => setSort(o.key)}>
                {o.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="text-sm text-muted-foreground hidden md:block">
          Ricerca: “{query || "tutto"}”
        </div>
      </div>
    </div>
  );
}

function ProductCard({ p, onAdd, onQuick }) {
  const out = p.stock === 0;
  return (
    <Card className="rounded-3xl overflow-hidden group">
      <div className="relative">
        <img src={p.image} alt={p.title} className="h-56 w-full object-cover" />
        <div className="absolute top-3 left-3 flex gap-2">
          {p.badge && (
            <Badge className="rounded-xl bg-primary text-primary-foreground">
              {p.badge}
            </Badge>
          )}
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
      </div>
      <CardHeader className="space-y-1">
        <CardTitle className="line-clamp-1">{p.title}</CardTitle>
        <CardDescription className="flex items-center justify-between">
          <Stars value={p.rating} />
          <span className="text-xs">{p.reviews} recensioni</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="text-sm text-muted-foreground grid grid-cols-2 gap-1">
          {p.highlights.map((h, i) => (
            <li key={i}>• {h}</li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-lg">{currency(p.price)}</div>
          <div className={`text-xs ${out ? "text-red-600" : "text-muted-foreground"}`}>
            {out ? "Non disponibile" : `Disponibilità: ${p.stock}pz`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => onQuick(p)}>
            Dettagli
          </Button>
          <Button size="sm" disabled={out} className="rounded-2xl" onClick={() => onAdd(p)}>
            <ShoppingCart className="h-4 w-4 mr-2" /> Aggiungi
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function CartSheet() {
  const [items, setItems] = useState([]);
  const total = items.reduce((s, it) => s + it.price * it.qty, 0);
  const checkout = async () => {
    try {
      await createCheckout(items.map((i) => ({ id: i.id, qty: i.qty })));
    } catch (e) {
      alert(e.message);
    }
  };
  return (
    <SheetContent className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Carrello</SheetTitle>
      </SheetHeader>
      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Il carrello è vuoto</div>
        ) : (
          items.map((it) => (
            <div key={it.id} className="flex items-center gap-3">
              <img src={it.image} className="h-16 w-16 rounded-xl object-cover" />
              <div className="flex-1">
                <div className="font-medium line-clamp-1">{it.title}</div>
                <div className="text-xs text-muted-foreground">Qt: {it.qty}</div>
              </div>
              <div className="font-medium">{currency(it.price * it.qty)}</div>
            </div>
          ))
        )}
      </div>
      <Separator className="my-4" />
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Totale</div>
        <div className="text-lg font-semibold">{currency(total)}</div>
      </div>
      <Button className="w-full mt-4 rounded-2xl" onClick={checkout}>Vai al pagamento</Button>
    </SheetContent>
  );
}

function USPStrip() {
  return (
    <div className="bg-amber-50 border-y">
      <div className="max-w-7xl mx-auto px-4 py-6 grid sm:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4"/> Acciaio inox certificato</div>
        <div className="flex items-center gap-2"><Flame className="h-4 w-4"/> Design ottimizzato per la brace</div>
        <div className="flex items-center gap-2"><Truck className="h-4 w-4"/> Spedizioni in tutta Italia</div>
      </div>
    </div>
  );
}

function Newsletter() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Card className="rounded-3xl bg-gradient-to-br from-amber-50 to-white">
        <CardHeader>
          <CardTitle>Iscriviti alla newsletter</CardTitle>
          <CardDescription>Ricette, guide alla cottura, novità e offerte.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3">
          <Input placeholder="La tua email" className="rounded-2xl" />
          <Button className="rounded-2xl">Iscrivimi</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-4 gap-8">
        <div>
          <div className="font-bold text-xl">BraciArte</div>
          <p className="mt-2 text-slate-400 text-sm">
            Manifattura italiana per la cucina all'aperto.
          </p>
        </div>
        <div>
          <div className="font-semibold">Supporto</div>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            <li>Contatti</li>
            <li>Spedizioni</li>
            <li>Resi</li>
            <li>Garanzia</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold">Azienda</div>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            <li>Chi siamo</li>
            <li>Press</li>
            <li>Affiliazioni</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold">Legale</div>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            <li>Privacy</li>
            <li>Cookie</li>
            <li>Termini</li>
          </ul>
        </div>
      </div>
      <div className="border-top border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 text-xs text-slate-400">
          © {new Date().getFullYear()} BraciArte S.r.l.
        </div>
      </div>
    </footer>
  );
}

export default function EcommerceBBQ() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sort, setSort] = useState("relevance");
  const [cart, setCart] = useState([]);
  const [quick, setQuick] = useState(null);
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);

  useEffect(() => {
    fetchProducts().then(setProducts);
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (selectedCategory) list = list.filter((p) => p.category === selectedCategory);
    if (query) list = list.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));
    switch (sort) {
      case "price_asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating_desc":
        list.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }
    return list;
  }, [query, selectedCategory, sort, products]);

  const addToCart = (p) =>
    setCart((c) => {
      const exists = c.find((i) => i.id === p.id);
      if (exists) return c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { ...p, qty: 1 }];
    });

  const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id));

  const goCheckout = async () => {
    try {
      await createCheckout(cart.map((i) => ({ id: i.id, qty: i.qty })));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Topbar />
        <Navbar onSearch={setQuery} cartCount={cart.reduce((s, i) => s + i.qty, 0)} />
        <Hero />
        <USPStrip />

        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4">
            <div className="py-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Home</span> <ChevronRight className="h-4 w-4" /> <span>Catalogo</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <h2 className="text-2xl font-bold">Catalogo prodotti</h2>
                <Badge variant="secondary" className="rounded-xl">
                  {filtered.length} risultati
                </Badge>
              </div>

              <Filters
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                sort={sort}
                setSort={setSort}
                query={query}
              />

              <Tabs defaultValue="grid" className="mt-2">
                <TabsList className="rounded-2xl">
                  <TabsTrigger value="grid">Griglia</TabsTrigger>
                  <TabsTrigger value="bestsellers">Bestseller</TabsTrigger>
                  <TabsTrigger value="new">Novità</TabsTrigger>
                </TabsList>
                <TabsContent value="grid" className="mt-4">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((p) => (
                      <ProductCard key={p.id} p={p} onAdd={addToCart} onQuick={setQuick} />
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="bestsellers" className="mt-4">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {products
                      .filter((p) => p.badge === "Bestseller")
                      .map((p) => (
                        <ProductCard key={p.id} p={p} onAdd={addToCart} onQuick={setQuick} />
                      ))}
                  </div>
                </TabsContent>
                <TabsContent value="new" className="mt-4">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {products
                      .filter((p) => p.badge === "Novità")
                      .map((p) => (
                        <ProductCard key={p.id} p={p} onAdd={addToCart} onQuick={setQuick} />
                      ))}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-8 flex justify-end">
                <Button size="lg" className="rounded-2xl" onClick={goCheckout}>
                  Procedi al checkout
                </Button>
              </div>
            </div>
          </div>
          <Newsletter />
        </main>

        <Footer />

        <AnimatePresence>
          {quick && (
            <Dialog open onOpenChange={() => setQuick(null)}>
              <DialogContent className="max-w-2xl rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="pr-8">{quick.title}</DialogTitle>
                  <DialogDescription>{quick.highlights.join(" · ")}</DialogDescription>
                </DialogHeader>
                <div className="grid md:grid-cols-2 gap-6">
                  <img src={quick.image} className="rounded-2xl h-64 w-full object-cover" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Stars value={quick.rating} />
                      <Badge variant="outline" className="rounded-xl">
                        {quick.reviews} recensioni
                      </Badge>
                    </div>
                    <div className="text-3xl font-bold">{currency(quick.price)}</div>
                    <div className="text-sm text-muted-foreground">Spedizione: {quick.shipping}</div>
                    <div className="flex items-center gap-2">
                      <Button
                        className="rounded-2xl"
                        onClick={() => {
                          addToCart(quick);
                          setQuick(null);
                        }}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" /> Aggiungi al carrello
                      </Button>
                      <Button variant="outline" className="rounded-2xl" onClick={() => setQuick(null)}>
                        <X className="h-4 w-4 mr-2" /> Chiudi
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}

/*
========================
 BACKEND DI ESEMPIO (Next.js API routes)
========================
// /pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const products = [
  // Allinea questi oggetti a FALLBACK_PRODUCTS e aggiungi altri SKU reali.
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') return res.status(200).json(products);
  return res.status(405).end();
}

// /pages/api/checkout.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { items } = req.body as { items: { id: string; qty: number }[] };

  // Mappa ID -> prezzi Stripe (price_XXXXXXXX)
  const priceMap: Record<string, string> = {
    bbq1: 'price_xxx_bbq1',
    gr1: 'price_xxx_gr1',
    tg1: 'price_xxx_tg1',
    od1: 'price_xxx_od1',
  };

  const line_items = items.map((i) => ({ price: priceMap[i.id], quantity: i.qty }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
    shipping_address_collection: { allowed_countries: ['IT', 'SM', 'VA'] },
    billing_address_collection: 'auto',
  });

  res.status(200).json({ sessionId: session.id });
}

// Webhook (opzionale) /pages/api/stripe-webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sig = req.headers['stripe-signature'] as string;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });
  const buf = await (await import('raw-body')).default(req);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // Gestisci event.type === 'checkout.session.completed'
  res.json({ received: true });
}
*/
