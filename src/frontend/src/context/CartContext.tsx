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
  price: number;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, storeId?: bigint) => void;
  increaseQty: (id: string) => void;
  decreaseQty: (id: string) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  currentStoreId: bigint | null;
  setCurrentStoreId: (id: bigint | null) => void;
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

  const [currentStoreId, setCurrentStoreIdState] = useState<bigint | null>(
    () => {
      try {
        const stored = localStorage.getItem(STORE_KEY);
        return stored ? BigInt(stored) : null;
      } catch {
        return null;
      }
    },
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const setCurrentStoreId = useCallback((id: bigint | null) => {
    setCurrentStoreIdState(id);
    if (id !== null) {
      localStorage.setItem(STORE_KEY, id.toString());
    } else {
      localStorage.removeItem(STORE_KEY);
    }
  }, []);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, storeId?: bigint) => {
      // Check for store conflict
      if (storeId !== undefined) {
        setCurrentStoreIdState((prev) => {
          if (prev !== null && prev !== storeId) {
            // Store conflict — warn user
            toast.error(
              "Your cart has items from another store. Clear your cart to shop here.",
              { duration: 4000 },
            );
            return prev; // don't change store
          }
          if (prev === null) {
            localStorage.setItem(STORE_KEY, storeId.toString());
          }
          return storeId;
        });
        // Check items before adding — if conflict, bail
        setItems((prev) => {
          const storeKey = localStorage.getItem(STORE_KEY);
          const existingStoreId = storeKey ? BigInt(storeKey) : null;
          if (existingStoreId !== null && existingStoreId !== storeId) {
            return prev; // conflict, don't add
          }
          const existing = prev.find((i) => i.id === item.id);
          if (existing) {
            return prev.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
            );
          }
          return [...prev, { ...item, quantity: 1 }];
        });
      } else {
        setItems((prev) => {
          const existing = prev.find((i) => i.id === item.id);
          if (existing) {
            return prev.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
            );
          }
          return [...prev, { ...item, quantity: 1 }];
        });
      }
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
        totalPrice,
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
