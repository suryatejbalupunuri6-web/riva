import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock, Search, Star, Store, X } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { Store as StoreType } from "../backend";
import { useAllStores } from "../hooks/useQueries";

type CategoryEntry = { label: string; icon: string };

const CATEGORY_FILTERS: CategoryEntry[] = [
  { label: "All", icon: "🏪" },
  { label: "Stationery", icon: "📚" },
  { label: "Grocery", icon: "🛒" },
  { label: "Fruits", icon: "🍎" },
  { label: "Fashion", icon: "👗" },
  { label: "Toys", icon: "🧸" },
];

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
      {rounded > 0 ? rounded.toFixed(1) : "New"}
    </span>
  );
}

function StoreCard({
  store,
  idx,
  onClick,
}: {
  store: StoreType;
  idx: number;
  onClick: () => void;
}) {
  const imgSrc =
    store.imageUrl && store.imageUrl.trim() !== ""
      ? store.imageUrl
      : `https://picsum.photos/seed/store-${store.id}/400/200`;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * idx }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col text-left w-full transition-shadow hover:shadow-md"
      data-ocid={`stores.item.${idx + 1}`}
    >
      <div className="relative">
        <img
          src={imgSrc}
          alt={store.name}
          className="w-full h-32 object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://picsum.photos/seed/store-${store.id}/400/200`;
          }}
        />
        {/* Closed overlay */}
        {!store.isOpen && (
          <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
            <span className="text-xs font-extrabold text-white bg-foreground/70 px-2 py-1 rounded-lg">
              CLOSED
            </span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              store.isOpen
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {store.isOpen ? "OPEN" : "CLOSED"}
          </span>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="font-extrabold text-sm text-foreground truncate">
          {store.name}
        </p>
        <Badge
          variant="secondary"
          className="w-fit text-[10px] px-1.5 py-0 font-semibold bg-primary/10 text-primary border-primary/20"
        >
          {Array.isArray(store.categories) && store.categories.length > 0
            ? store.categories.join(", ")
            : "General"}
        </Badge>
        <div className="flex items-center justify-between mt-1">
          <StarRating rating={store.rating} />
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {store.deliveryTime}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function StoreCardSkeleton({ idx }: { idx: number }) {
  return (
    <div
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
      style={{ animationDelay: `${idx * 80}ms` }}
    >
      <Skeleton className="w-full h-32" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

const SKELETON_KEYS = ["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"];

export default function StoreListPage() {
  const navigate = useNavigate();
  const { data: stores = [], isLoading } = useAllStores();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(() => {
    try {
      const saved = localStorage.getItem("riva_category_filter");
      if (saved) {
        localStorage.removeItem("riva_category_filter");
        return saved;
      }
    } catch {}
    return "All";
  });

  const filtered = useMemo(() => {
    let result = stores;

    if (activeCategory !== "All") {
      result = result.filter((s) =>
        Array.isArray(s.categories)
          ? s.categories.some(
              (c) => c.toLowerCase() === activeCategory.toLowerCase(),
            )
          : false,
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (Array.isArray(s.categories)
            ? s.categories.some((c) => c.toLowerCase().includes(q))
            : false) ||
          s.description.toLowerCase().includes(q),
      );
    }

    return [...result].sort((a, b) => {
      if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
      return b.rating - a.rating;
    });
  }, [stores, search, activeCategory]);

  const handleStoreClick = (store: StoreType) => {
    navigate({ to: "/customer/store/$storeId", params: { storeId: store.id } });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={() => navigate({ to: "/customer" })}
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          data-ocid="stores.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-xl font-extrabold text-foreground flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" />
          Browse Stores
        </h1>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stores, categories..."
          className="pl-9 pr-9 rounded-xl text-sm"
          data-ocid="stores.search_input"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category pills */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4"
        style={{ scrollbarWidth: "none" }}
        data-ocid="stores.categories.list"
      >
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.label}
            type="button"
            onClick={() => setActiveCategory(cat.label)}
            className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full transition-colors border shadow-sm ${
              activeCategory === cat.label
                ? "text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
            style={
              activeCategory === cat.label
                ? { backgroundColor: "#16a34a", borderColor: "#16a34a" }
                : undefined
            }
            data-ocid="stores.category.tab"
          >
            <span className="text-sm leading-none">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-xs text-muted-foreground mb-3 font-medium">
          {filtered.length} store{filtered.length !== 1 ? "s" : ""}
          {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
          {search ? ` matching "${search}"` : ""}
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div
          className="grid grid-cols-2 gap-3"
          data-ocid="stores.loading_state"
        >
          {SKELETON_KEYS.map((k, i) => (
            <StoreCardSkeleton key={k} idx={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground"
          data-ocid="stores.empty_state"
        >
          <Store className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-semibold text-foreground">
            {search || activeCategory !== "All"
              ? "No stores match your search"
              : "No stores available yet"}
          </p>
          {(search || activeCategory !== "All") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setActiveCategory("All");
              }}
              className="mt-2 text-primary"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3" data-ocid="stores.list">
          {filtered.map((store, i) => (
            <StoreCard
              key={store.id}
              store={store}
              idx={i}
              onClick={() => handleStoreClick(store)}
            />
          ))}
        </div>
      )}

      <div className="h-6" />
    </div>
  );
}
