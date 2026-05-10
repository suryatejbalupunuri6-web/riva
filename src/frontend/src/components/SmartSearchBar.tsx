import { Clock, Search, TrendingUp, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "../backend";
import {
  BRAND_KEYWORDS,
  TRENDING_SEARCHES,
  clearRecentSearches,
  getRecentSearches,
  saveRecentSearch,
} from "../utils/searchUtils";

interface SmartSearchBarProps {
  products?: Product[];
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

interface Suggestion {
  text: string;
  category?: string;
}

function buildSuggestions(query: string, products: Product[]): Suggestion[] {
  if (!query.trim() || query.length < 1) return [];
  const lower = query.toLowerCase();
  const seen = new Set<string>();
  const results: Suggestion[] = [];

  // 1. Direct product name matches
  for (const p of products) {
    const name = p.name.toLowerCase();
    if (name.includes(lower) && !seen.has(p.name)) {
      seen.add(p.name);
      results.push({ text: p.name });
      if (results.length >= 5) return results;
    }
  }

  // 2. Brand keyword expansions
  for (const [brand, keywords] of Object.entries(BRAND_KEYWORDS)) {
    if (brand.includes(lower) || lower.includes(brand)) {
      for (const kw of keywords) {
        if (!seen.has(kw)) {
          seen.add(kw);
          results.push({ text: kw, category: brand });
          if (results.length >= 5) return results;
        }
      }
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

export default function SmartSearchBar({
  products = [],
  value,
  onChange,
  onSearch,
  autoFocus = false,
  placeholder = "Search products & stores...",
}: SmartSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (open) setRecentSearches(getRecentSearches());
  }, [open]);

  const computeSuggestions = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSuggestions(buildSuggestions(q, products));
        setActiveIdx(-1);
      }, 100);
    },
    [products],
  );

  useEffect(() => {
    computeSuggestions(value);
  }, [value, computeSuggestions]);

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
    setActiveIdx(-1);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onChange("");
    onSearch("");
    inputRef.current?.focus();
  };

  const allItems = [
    ...suggestions.map((s) => s.text),
    ...(value ? [] : recentSearches.slice(0, 5)),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && allItems[activeIdx]) {
        handleSubmit(allItems[activeIdx]);
      } else {
        handleSubmit(value);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  const showSuggestions = value.length >= 1 && suggestions.length > 0;
  const showRecent = !value && recentSearches.length > 0;
  const showTrending = !value;
  const hasDropdown = showSuggestions || showRecent || showTrending;

  return (
    <div ref={containerRef} className="relative w-full mb-4">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-all"
          data-ocid="search.search_input"
          aria-label="Search products and stores"
          aria-expanded={open && hasDropdown}
          aria-autocomplete="list"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && hasDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.13 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-xl overflow-hidden"
            aria-label="Search suggestions"
          >
            {showSuggestions && (
              <div className="px-2 pt-2 pb-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 px-2">
                  Suggestions
                </p>
                {suggestions.map((s, i) => (
                  <button
                    key={s.text}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSubmit(s.text);
                    }}
                    className={`w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left transition-colors ${
                      activeIdx === i ? "bg-muted/70" : "hover:bg-muted/50"
                    }`}
                    data-ocid="search.suggestion.item"
                  >
                    <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-foreground/80">
                        {highlightMatch(s.text, value)}
                      </span>
                      {s.category && (
                        <span className="block text-[11px] text-muted-foreground mt-0.5 truncate">
                          {s.category}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showRecent && (
              <div className="px-2 pt-2 pb-1">
                <div className="flex items-center justify-between mb-1 px-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Recent
                  </p>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      clearRecentSearches();
                      setRecentSearches([]);
                    }}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
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
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-foreground/80 hover:bg-muted/50 text-left transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            )}

            {showTrending && (
              <div className="px-2 pt-1 pb-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 px-2">
                  Trending
                </p>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {TRENDING_SEARCHES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSubmit(t);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
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
