import { Clock, Search, TrendingUp, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Product } from "../backend";
import {
  TRENDING_SEARCHES,
  clearRecentSearches,
  getRecentSearches,
  getSuggestions,
  saveRecentSearch,
} from "../utils/searchUtils";

interface SmartSearchBarProps {
  products: Product[];
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
}

export default function SmartSearchBar({
  products,
  value,
  onChange,
  onSearch,
}: SmartSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent searches when dropdown opens
  useEffect(() => {
    if (open) setRecentSearches(getRecentSearches());
  }, [open]);

  // Compute suggestions based on query
  useEffect(() => {
    setSuggestions(getSuggestions(products, value));
  }, [value, products]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = (query: string) => {
    const q = query.trim();
    if (q) saveRecentSearch(q);
    onSearch(q);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onChange("");
    onSearch("");
    inputRef.current?.focus();
  };

  const showRecent = !value && recentSearches.length > 0;
  const showTrending = !value;
  const showSuggestions = value.length >= 2 && suggestions.length > 0;
  const hasDropdown = showRecent || showTrending || showSuggestions;

  return (
    <div ref={containerRef} className="relative w-full mb-4">
      {/* Search Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder="Search products..."
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit(value);
            if (e.key === "Escape") setOpen(false);
          }}
          className="w-full h-11 pl-10 pr-10 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all"
          data-ocid="search.input"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && hasDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden"
          >
            {/* Product name suggestions */}
            {showSuggestions && (
              <div className="px-3 pt-3 pb-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Suggestions
                </p>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSubmit(s);
                    }}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-800 hover:bg-gray-50 text-left"
                  >
                    <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {showRecent && (
              <div className="px-3 pt-3 pb-1">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Recent
                  </p>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      clearRecentSearches();
                      setRecentSearches([]);
                    }}
                    className="text-[10px] text-gray-400 hover:text-red-500"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.slice(0, 5).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSubmit(s);
                    }}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 text-left"
                  >
                    <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Trending */}
            {showTrending && (
              <div className="px-3 pt-2 pb-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Trending
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TRENDING_SEARCHES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSubmit(t);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
                    >
                      <TrendingUp className="w-3 h-3" />
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
