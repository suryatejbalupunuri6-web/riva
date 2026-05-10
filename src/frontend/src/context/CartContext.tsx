import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  name: string;
  /** sellingPrice (or price if no discount) */
  price: number;
  quantity: number;
  /** product image URL */
  imageUrl?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, storeId?: string) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  /** Total number of items (sum of quantities) */
  totalItems: number;
  /** itemCount alias */
  itemCount: number;
  /** Sum of sellingPrice × qty */
  totalPrice: number;
  /** cartTotal alias */
  cartTotal: number;
  /** storeId (string) that the current cart belongs to */
  currentStoreId: string | null;
  setCurrentStoreId: (id: string | null) => void;
}

const STORAGE_KEY = "riva_cart";
const STORE_KEY = "riva_cart_store";

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [currentStoreId, setCurrentStoreIdState] = useState<string | null>(
    () => {
      try {
        return localStorage.getItem(STORE_KEY) ?? null;
      } catch {
        return null;
      }
    },
  );

  // Persist cart items
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const setCurrentStoreId = useCallback((id: string | null) => {
    setCurrentStoreIdState(id);
    if (id !== null) {
      localStorage.setItem(STORE_KEY, id);
    } else {
      localStorage.removeItem(STORE_KEY);
    }
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, storeId?: string) => {
      if (storeId !== undefined) {
        const storedStoreKey = localStorage.getItem(STORE_KEY);
        if (storedStoreKey !== null && storedStoreKey !== storeId) {
          toast.error(
            "Your cart has items from another store. Clear your cart to shop here.",
            { duration: 4000 },
          );
          return;
        }
        // Set store before adding items
        if (storedStoreKey === null) {
          localStorage.setItem(STORE_KEY, storeId);
          setCurrentStoreIdState(storeId);
        }
      }

      setItems((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        if (existing) {
          return prev.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
          );
        }
        return [...prev, { ...item, quantity: 1 }];
      });
    },
    [],
  );

  const increaseQty = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i)),
    );
  }, []);

  const decreaseQty = useCallback((id: string) => {
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCurrentStoreId(null);
  }, [setCurrentStoreId]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        increaseQty,
        decreaseQty,
        removeItem,
        clearCart,
        totalItems,
        itemCount: totalItems,
        totalPrice,
        cartTotal: totalPrice,
        currentStoreId,
        setCurrentStoreId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
