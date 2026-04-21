import type { Product } from "../backend";

// ─────────────────────────────────────────────
// Internal NLP-style query parser
// Converts free-text queries into structured filters + relevance scores
// No external APIs — runs entirely in the browser
// ─────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  snacks: [
    "snack",
    "chips",
    "biscuit",
    "cookie",
    "namkeen",
    "wafer",
    "cracker",
    "popcorn",
    "party",
    "munch",
    "crunchy",
  ],
  beverages: [
    "drink",
    "juice",
    "water",
    "cola",
    "soda",
    "tea",
    "coffee",
    "milk",
    "lassi",
    "energy",
    "beverage",
    "bottle",
  ],
  fruits: [
    "fruit",
    "apple",
    "banana",
    "mango",
    "orange",
    "grape",
    "healthy",
    "fresh",
    "natural",
  ],
  vegetables: [
    "vegetable",
    "veggie",
    "onion",
    "tomato",
    "potato",
    "carrot",
    "green",
    "salad",
    "healthy",
    "organic",
  ],
  dairy: [
    "dairy",
    "milk",
    "curd",
    "yogurt",
    "paneer",
    "cheese",
    "butter",
    "ghee",
    "cream",
  ],
  breakfast: [
    "breakfast",
    "quick",
    "morning",
    "oats",
    "cereal",
    "bread",
    "egg",
    "poha",
    "upma",
    "cornflakes",
  ],
  staples: [
    "rice",
    "flour",
    "wheat",
    "dal",
    "lentil",
    "grain",
    "staple",
    "basic",
    "essential",
  ],
  personal_care: [
    "soap",
    "shampoo",
    "toothpaste",
    "face",
    "skin",
    "cream",
    "lotion",
    "hygiene",
  ],
};

const PRICE_PATTERNS = [
  { pattern: /under\s*(\d+)/i, type: "max" as const },
  { pattern: /below\s*(\d+)/i, type: "max" as const },
  { pattern: /less\s+than\s*(\d+)/i, type: "max" as const },
  { pattern: /upto?\s*(\d+)/i, type: "max" as const },
  { pattern: /within\s*(\d+)/i, type: "max" as const },
  { pattern: /above\s*(\d+)/i, type: "min" as const },
  { pattern: /over\s*(\d+)/i, type: "min" as const },
  { pattern: /more\s+than\s*(\d+)/i, type: "min" as const },
];

const CHEAP_WORDS = [
  "cheap",
  "budget",
  "affordable",
  "low cost",
  "inexpensive",
  "economical",
  "value",
];
const PREMIUM_WORDS = ["premium", "quality", "best", "top", "expensive"];

export interface ParsedQuery {
  keywords: string[];
  categories: string[];
  maxPrice: number | null;
  minPrice: number | null;
  isCheap: boolean;
  isPremium: boolean;
  rawQuery: string;
}

export function parseQuery(query: string): ParsedQuery {
  const lower = query.toLowerCase().trim();
  const words = lower.split(/\s+/);

  // Extract price filters
  let maxPrice: number | null = null;
  let minPrice: number | null = null;
  for (const { pattern, type } of PRICE_PATTERNS) {
    const m = lower.match(pattern);
    if (m) {
      const val = Number.parseInt(m[1]);
      if (type === "max") maxPrice = val;
      else minPrice = val;
    }
  }

  const isCheap = CHEAP_WORDS.some((w) => lower.includes(w));
  const isPremium = PREMIUM_WORDS.some((w) => lower.includes(w));
  if (isCheap && maxPrice === null) maxPrice = 100; // default cheap threshold

  // Match categories
  const matchedCategories: string[] = [];
  for (const [cat, catWords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (
      catWords.some((cw) => words.some((w) => w.includes(cw) || cw.includes(w)))
    ) {
      matchedCategories.push(cat);
    }
  }

  // Clean keywords (remove price-related words)
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "some",
    "any",
    "and",
    "or",
    "of",
    "for",
    "me",
    "i",
    "want",
    "need",
    "show",
    "find",
    "get",
  ]);
  const keywords = words.filter(
    (w) => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w),
  );

  return {
    keywords,
    categories: matchedCategories,
    maxPrice,
    minPrice,
    isCheap,
    isPremium,
    rawQuery: query,
  };
}

export function scoreProduct(product: Product, parsed: ParsedQuery): number {
  if (!parsed.rawQuery.trim()) return 1; // no query = show all

  const name = product.name.toLowerCase();
  const desc = (product.description || "").toLowerCase();
  const price = product.price;

  let score = 0;

  // Hard filter: price
  if (parsed.maxPrice !== null && price > parsed.maxPrice) return -1;
  if (parsed.minPrice !== null && price < parsed.minPrice) return -1;

  // Keyword match in name (strong)
  for (const kw of parsed.keywords) {
    if (name.includes(kw)) score += 10;
    else if (
      name.split(" ").some((nw) => nw.startsWith(kw) || kw.startsWith(nw))
    )
      score += 6;
    if (desc.includes(kw)) score += 3;
  }

  // Category match
  for (const cat of parsed.categories) {
    const catWords = CATEGORY_KEYWORDS[cat] || [];
    for (const cw of catWords) {
      if (name.includes(cw) || desc.includes(cw)) {
        score += 5;
        break;
      }
    }
  }

  // Cheap boost: lower price = higher score
  if (parsed.isCheap) {
    score += Math.max(0, 5 - price / 20);
  }

  // Exact partial name match bonus
  if (name.includes(parsed.rawQuery.toLowerCase())) score += 15;

  return score;
}

export function filterAndRankProducts(
  products: Product[],
  query: string,
): Product[] {
  if (!query.trim()) return products;

  const parsed = parseQuery(query);
  const scored = products
    .map((p) => ({ product: p, score: scoreProduct(p, parsed) }))
    .filter(({ score }) => score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.map(({ product }) => product);
}

export function getSuggestions(products: Product[], query: string): string[] {
  if (!query.trim() || query.length < 2) return [];
  const lower = query.toLowerCase();
  const names = products
    .filter((p) => p.name.toLowerCase().includes(lower))
    .map((p) => p.name)
    .slice(0, 5);
  return [...new Set(names)];
}

export const TRENDING_SEARCHES = [
  "cheap snacks",
  "healthy food",
  "quick breakfast",
  "party items",
  "under 50 rupees",
  "dairy products",
  "fresh vegetables",
];

const RECENT_KEY = "riva_recent_searches";

export function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): void {
  if (!query.trim()) return;
  try {
    const prev = getRecentSearches();
    const updated = [query, ...prev.filter((q) => q !== query)].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function clearRecentSearches(): void {
  localStorage.removeItem(RECENT_KEY);
}

// ─────────────────────────────────────────────
// Store search utilities
// ─────────────────────────────────────────────
import type { Store } from "../backend";

const FAST_DELIVERY_WORDS = [
  "fast",
  "quick",
  "speedy",
  "express",
  "10 min",
  "15 min",
  "instant",
];

export function scoreStore(store: Store, parsed: ParsedQuery): number {
  if (!parsed.rawQuery.trim()) return 1;
  const name = store.name.toLowerCase();
  const cat = store.category.toLowerCase();
  const desc = store.description.toLowerCase();
  const delivery = store.deliveryTime.toLowerCase();
  let score = 0;

  const q = parsed.rawQuery.toLowerCase();
  if (name.includes(q)) score += 15;
  else if (parsed.keywords.some((kw) => name.includes(kw))) score += 8;
  if (parsed.keywords.some((kw) => cat.includes(kw))) score += 10;
  if (parsed.keywords.some((kw) => desc.includes(kw))) score += 5;
  if (FAST_DELIVERY_WORDS.some((w) => q.includes(w)) || q.includes("fast")) {
    if (FAST_DELIVERY_WORDS.some((w) => delivery.includes(w))) score += 6;
  }
  for (const [, catWords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (
      catWords.some(
        (cw) =>
          parsed.keywords.includes(cw) ||
          parsed.rawQuery.toLowerCase().includes(cw),
      )
    ) {
      if (
        catWords.some(
          (cw) => cat.includes(cw) || name.includes(cw) || desc.includes(cw),
        )
      ) {
        score += 8;
        break;
      }
    }
  }
  if (score === 0) return 0;
  if (store.isOpen) score += 20;
  score += store.rating * 2;
  return score;
}

export function filterAndRankStores(stores: Store[], query: string): Store[] {
  if (!query.trim()) {
    return [...stores].sort((a, b) => {
      if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
      return b.rating - a.rating;
    });
  }
  const parsed = parseQuery(query);
  const scored = stores
    .map((s) => ({ store: s, score: scoreStore(s, parsed) }))
    .filter(({ score }) => score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.map(({ store }) => store);
}

export function getGlobalSuggestions(
  products: Product[],
  stores: Store[],
  query: string,
): string[] {
  if (!query.trim() || query.length < 2) return [];
  const lower = query.toLowerCase();
  const productNames = products
    .filter((p) => p.name.toLowerCase().includes(lower))
    .map((p) => p.name);
  const storeNames = stores
    .filter((s) => s.name.toLowerCase().includes(lower))
    .map((s) => s.name);
  return [...new Set([...productNames, ...storeNames])].slice(0, 6);
}
