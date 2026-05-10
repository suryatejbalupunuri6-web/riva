import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UserProfile } from "../backend";

// Keep AppScreen type for any remaining legacy references
export type AppScreen = string;

// All localStorage keys used by Riva — cleared on logout
const LS_KEYS = [
  "riva_user_name",
  "riva_cart",
  "riva_cart_store",
  "riva_vendor_access",
  "riva_delivery_access",
  "riva_clerk_session",
  "riva_terms",
  "riva_termsAccepted",
  "riva_acceptedVersion",
] as const;

interface AppContextType {
  currentPhone: string;
  setCurrentPhone: (phone: string) => void;
  clerkSessionId: string;
  setClerkSessionId: (id: string) => void;
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  /** Clears all Riva localStorage keys — call on logout */
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function readStoredName(): string {
  try {
    return localStorage.getItem("riva_user_name") ?? "";
  } catch {
    return "";
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentPhone, setCurrentPhone] = useState("");
  const [clerkSessionId, _setClerkSessionId] = useState("");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [customerName, _setCustomerName] = useState<string>(readStoredName);

  const setClerkSessionId = useCallback((id: string) => {
    _setClerkSessionId(id);
    try {
      if (id) {
        localStorage.setItem("riva_clerk_session", id);
      } else {
        localStorage.removeItem("riva_clerk_session");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setCustomerName = useCallback((name: string) => {
    _setCustomerName(name);
    try {
      if (name) {
        localStorage.setItem("riva_user_name", name);
      } else {
        localStorage.removeItem("riva_user_name");
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Sync customerName from profile when available
  useEffect(() => {
    if (currentUser?.name && !customerName) {
      setCustomerName(currentUser.name);
    }
  }, [currentUser, customerName, setCustomerName]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    _setCustomerName("");
    _setClerkSessionId("");
    setCurrentPhone("");
    try {
      for (const key of LS_KEYS) {
        localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentPhone,
        setCurrentPhone,
        clerkSessionId,
        setClerkSessionId,
        currentUser,
        setCurrentUser,
        customerName,
        setCustomerName,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
