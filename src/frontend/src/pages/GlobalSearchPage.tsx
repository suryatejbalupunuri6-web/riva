import { Badge } from "@/components/ui/badge";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock, Search, Star, Store, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Store as StoreType } from "../backend";
import PriceDisplay from "../components/PriceDisplay";
import { useApp } from "../context/AppContext";
import {
  type FrontendProduct,
  useAllProducts,
  useAllStores,
} from "../hooks/useQueries";
import {
  BRAND_KEYWORDS,
  TRENDING_SEARCHES,
  filterAndRankProducts,
  filterAndRankStores,
  getRecentSearches,
  saveRecentSearch,
} from "../utils/searchUtils";

function buildDropdownSuggestions(
  query: string,
  products: FrontendProduct[],
  stores: StoreType[],
): string[] {
  if (!query.trim() || query.length < 1) return [];
  const lower = query.toLowerCase();
  const seen = new Set<string>();
  const results: string[] = [];

  for (const p of products) {
    const name = p.name.toLowerCase();
    if (name.includes(lower) && !seen.has(p.name)) {
      seen.add(p.name);
      results.push(p.name);
      if (results.length >= 5) return results;
    }
  }

  for (const [brand, keywords] of Object.entries(BRAND_KEYWORDS)) {
    if (brand.includes(lower) || lower.includes(brand)) {
      for (const kw of keywords) {
        if (!seen.has(kw)) {
          seen.add(kw);
          results.push(kw);
          if (results.length >= 5) return results;
        }
      }
    }
  }

  for (const s of stores) {
    const name = s.name.toLowerCase();
    if (name.includes(lower) && !seen.has(s.name)) {
      seen.add(s.name);
      results.push(s.name);
      if (results.length >= 5) return results;
    }
  }

  return results;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-bold text-foreground">
        {text.slice(idx, idx + query.length)}
      </strong>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function GlobalSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: allProducts = [] } = useAllProducts();
  const { data: allStores = [] } = useAllStores();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(val), 150);
  }, []);

  const handleSearch = useCallback((q: string) => {
    if (q.trim()) saveRecentSearch(q.trim());
    setQuery(q);
    setDebouncedQuery(q);
  }, []);

  const rankedProducts = useMemo(
    () =>
      (
        filterAndRankProducts(
          allProducts as FrontendProduct[],
          debouncedQuery,
          allStores as StoreType[],
        ) as FrontendProduct[]
      ).slice(0, 10),
    [allProducts, allStores, debouncedQuery],
  );

  const rankedStores = useMemo(
    () =>
      filterAndRankStores(allStores as StoreType[], debouncedQuery).slice(0, 6),
    [allStores, debouncedQuery],
  );

  const suggestions = useMemo(
    () =>
      buildDropdownSuggestions(
        query,
        allProducts as FrontendProduct[],
        allStores as StoreType[],
      ),
    [allProducts, allStores, query],
  );

  const recentSearches = useMemo(() => getRecentSearches(), []);

  const goToStore = useCallback(
    (storeId: string) => {
      navigate({ to: "/customer/store/$storeId", params: { storeId } });
    },
    [navigate],
  );

  const storeMap = useMemo(() => {
    const m = new Map<string, StoreType>();
    for (const s of allStores as StoreType[]) {
      m.set(s.id, s);
    }
    return m;
  }, [allStores]);

  const hasQuery = debouncedQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-card border-b border-border shadow-sm">
        <div className="flex items-center gap-2 px-3 py-3 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => navigate({ to: "/customer" })}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
            data-ocid="search.back_button"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query.trim()) {
                  handleSearch(query.trim());
                  e.currentTarget.blur();
                }
              }}
              placeholder="Search products &amp; stores..."
              className="w-full h-10 pl-9 pr-9 rounded-xl bg-muted text-sm text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              data-ocid="search.search_input"
              aria-label="Search products and stores"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setDebouncedQuery("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
                data-ocid="search.clear_button"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Inline autocomplete suggestions dropdown */}
        {suggestions.length > 0 && query.length >= 1 && (
          <div className="max-w-2xl mx-auto px-3 pb-2">
            <div className="bg-card border border-border rounded-xl shadow-md overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSearch(s)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground/80 hover:bg-muted/50 text-left transition-colors"
                  data-ocid="search.suggestion.item"
                >
                  <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  {highlightMatch(s, query)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        {!hasQuery ? (
          <>
            {recentSearches.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Recent Searches
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleSearch(r)}
                      className="px-3 py-1.5 bg-card border border-border rounded-full text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🔥</span>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Trending
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {TRENDING_SEARCHES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleSearch(t)}
                    className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
                    data-ocid="search.tab"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Products Section */}
            <section className="mb-8" data-ocid="search.products.section">
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-lg">🛍️</span> Products
                {rankedProducts.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {rankedProducts.length} found
                  </span>
                )}
              </h2>

              {rankedProducts.length === 0 ? (
                <div
                  className="text-center py-8 text-muted-foreground"
                  data-ocid="search.products.empty_state"
                >
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="text-sm">
                    No products found for "{debouncedQuery}"
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rankedProducts.map((product, idx) => {
                    const store = storeMap.get(product.storeId);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => store && goToStore(store.id)}
                        className={`w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border shadow-sm transition-all text-left ${
                          store && !store.isOpen
                            ? "opacity-60 cursor-default"
                            : "hover:shadow-md hover:border-primary/20"
                        }`}
                        data-ocid={`search.products.item.${idx + 1}`}
                      >
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-xl">🛒</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {product.name}
                          </p>
                          {store && (
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                              <Store className="w-3 h-3" />
                              {store.name}
                              {store.deliveryTime && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span>{store.deliveryTime}</span>
                                </>
                              )}
                            </p>
                          )}
                          {store && !store.isOpen && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                              Store Closed
                            </span>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <PriceDisplay
                            sellingPrice={product.sellingPrice ?? product.price}
                            originalPrice={product.originalPrice}
                            size="sm"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Stores Section */}
            <section data-ocid="search.stores.section">
              <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="text-lg">🏪</span> Stores
                {rankedStores.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {rankedStores.length} found
                  </span>
                )}
              </h2>

              {rankedStores.length === 0 ? (
                <div
                  className="text-center py-8 text-muted-foreground"
                  data-ocid="search.stores.empty_state"
                >
                  <div className="text-3xl mb-2">🏪</div>
                  <p className="text-sm">
                    No stores found for "{debouncedQuery}"
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rankedStores.map((store, idx) => (
                    <button
                      key={store.id}
                      type="button"
                      onClick={() => goToStore(store.id)}
                      className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all text-left"
                      data-ocid={`search.stores.item.${idx + 1}`}
                    >
                      {store.imageUrl ? (
                        <img
                          src={store.imageUrl}
                          alt={store.name}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Store className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {store.name}
                          </p>
                          {store.isOpen ? (
                            <Badge className="text-xs py-0 px-1.5 bg-green-100 text-green-700 border-green-200 font-semibold">
                              OPEN
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs py-0 px-1.5 text-muted-foreground"
                            >
                              CLOSED
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span>{store.categories?.[0] ?? ""}</span>
                          <span className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {store.rating.toFixed(1)}
                          </span>
                          {store.deliveryTime && (
                            <>
                              <span>🕐</span>
                              <span>{store.deliveryTime}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
