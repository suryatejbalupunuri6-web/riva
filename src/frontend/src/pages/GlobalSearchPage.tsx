import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Search, Star, Store, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Product, Store as StoreType } from "../backend";
import { useApp } from "../context/AppContext";
import { useAllProducts, useAllStores } from "../hooks/useQueries";
import {
  TRENDING_SEARCHES,
  filterAndRankProducts,
  filterAndRankStores,
  getGlobalSuggestions,
  getRecentSearches,
  saveRecentSearch,
} from "../utils/searchUtils";

export default function GlobalSearchPage() {
  const { navigate, setCurrentStoreId } = useApp();
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
      filterAndRankProducts(allProducts as Product[], debouncedQuery).slice(
        0,
        10,
      ),
    [allProducts, debouncedQuery],
  );

  const rankedStores = useMemo(
    () =>
      filterAndRankStores(allStores as StoreType[], debouncedQuery).slice(0, 6),
    [allStores, debouncedQuery],
  );

  const suggestions = useMemo(
    () =>
      getGlobalSuggestions(
        allProducts as Product[],
        allStores as StoreType[],
        query,
      ),
    [allProducts, allStores, query],
  );

  const recentSearches = useMemo(() => getRecentSearches(), []);

  const goToStore = useCallback(
    (storeId: bigint) => {
      setCurrentStoreId(storeId);
      navigate("store-detail");
    },
    [setCurrentStoreId, navigate],
  );

  const storeMap = useMemo(() => {
    const m = new Map<string, StoreType>();
    for (const s of allStores as StoreType[]) {
      m.set(s.storeId.toString(), s);
    }
    return m;
  }, [allStores]);

  const hasQuery = debouncedQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 px-3 py-3 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={() => navigate("customer-dashboard")}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            data-ocid="search.back_button"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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
              className="w-full h-10 pl-9 pr-9 rounded-xl bg-gray-100 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              data-ocid="search.input"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setDebouncedQuery("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
                data-ocid="search.clear_button"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && query.length >= 2 && (
          <div className="max-w-2xl mx-auto px-3 pb-2">
            <div className="bg-white border border-gray-100 rounded-xl shadow-md overflow-hidden">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSearch(s)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        {!hasQuery ? (
          /* Empty state: recent + trending */
          <>
            {recentSearches.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Recent Searches
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleSearch(r)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
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
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
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
          /* Search results */
          <>
            {/* Products Section */}
            <section className="mb-8" data-ocid="search.products.section">
              <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-lg">🛍️</span> Products
                {rankedProducts.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-gray-400">
                    {rankedProducts.length} found
                  </span>
                )}
              </h2>

              {rankedProducts.length === 0 ? (
                <div
                  className="text-center py-8 text-gray-400"
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
                    const store = storeMap.get(product.storeId.toString());
                    return (
                      <button
                        key={product.productId.toString()}
                        type="button"
                        onClick={() => store && goToStore(store.storeId)}
                        className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all text-left"
                        data-ocid={`search.products.item.${idx + 1}`}
                      >
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl">🛒</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">
                            {product.name}
                          </p>
                          {store && (
                            <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
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
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-bold text-primary">
                            ₹{product.price}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Stores Section */}
            <section data-ocid="search.stores.section">
              <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-lg">🏪</span> Stores
                {rankedStores.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-gray-400">
                    {rankedStores.length} found
                  </span>
                )}
              </h2>

              {rankedStores.length === 0 ? (
                <div
                  className="text-center py-8 text-gray-400"
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
                      key={store.storeId.toString()}
                      type="button"
                      onClick={() => goToStore(store.storeId)}
                      className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all text-left"
                      data-ocid={`search.stores.item.${idx + 1}`}
                    >
                      {store.image ? (
                        <img
                          src={store.image}
                          alt={store.name}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Store className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-gray-900 truncate">
                            {store.name}
                          </p>
                          {store.isOpen ? (
                            <Badge className="text-xs py-0 px-1.5 bg-green-100 text-green-700 border-green-200 font-semibold">
                              OPEN
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs py-0 px-1.5 text-gray-400"
                            >
                              CLOSED
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                          <span>{store.category}</span>
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
