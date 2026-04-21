import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Search, Star, Store, X } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import type { Store as StoreType } from "../backend";
import { useApp } from "../context/AppContext";
import { useAllStores } from "../hooks/useQueries";

const CATEGORY_FILTERS = [
  "All",
  "Grocery",
  "Snacks",
  "Fruits",
  "Beverages",
  "Bakery",
  "Dairy",
  "Electronics",
  "Other",
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
    store.image && store.image.trim() !== ""
      ? store.image
      : `https://via.placeholder.com/400x200?text=${encodeURIComponent(store.name)}`;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * idx }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col text-left w-full transition-shadow hover:shadow-md"
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
              `https://via.placeholder.com/400x200?text=${encodeURIComponent(store.name)}`;
          }}
        />
        <div className="absolute top-2 right-2">
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              store.isOpen
                ? "bg-green-500 text-white"
                : "bg-gray-400 text-white"
            }`}
          >
            {store.isOpen ? "OPEN" : "CLOSED"}
          </span>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="font-extrabold text-sm text-gray-900 truncate">
          {store.name}
        </p>
        <Badge
          variant="secondary"
          className="w-fit text-[10px] px-1.5 py-0 font-semibold bg-green-50 text-green-700 border-green-200"
        >
          {store.category}
        </Badge>
        <div className="flex items-center justify-between mt-1">
          <StarRating rating={store.rating} />
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
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
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
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
  const { navigate, setCurrentStoreId } = useApp();
  const { data: stores = [], isLoading } = useAllStores();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = useMemo(() => {
    let result = stores;

    if (activeCategory !== "All") {
      result = result.filter(
        (s) => s.category.toLowerCase() === activeCategory.toLowerCase(),
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }

    return [...result].sort((a, b) => {
      if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
      return b.rating - a.rating;
    });
  }, [stores, search, activeCategory]);

  const handleStoreClick = (store: StoreType) => {
    setCurrentStoreId(store.storeId);
    navigate("store-detail");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={() => navigate("customer-dashboard")}
          className="flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700"
          data-ocid="stores.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-green-500" />
          Browse Stores
        </h1>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stores, categories..."
          className="pl-9 pr-9 border-gray-200 rounded-xl bg-white text-sm"
          data-ocid="stores.search_input"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-colors border ${
              activeCategory === cat
                ? "bg-green-500 text-white border-green-500"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
            data-ocid="stores.category.tab"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-xs text-gray-500 mb-3 font-medium">
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
          className="text-center py-16 text-gray-500"
          data-ocid="stores.empty_state"
        >
          <Store className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-600">
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
              className="mt-2 text-green-600"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3" data-ocid="stores.list">
          {filtered.map((store, i) => (
            <StoreCard
              key={store.storeId.toString()}
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
