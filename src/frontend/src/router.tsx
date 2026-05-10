import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { UserRole } from "./backend";
import { AppProvider, useApp } from "./context/AppContext";
import { CartProvider } from "./context/CartContext";
import { NotificationProvider } from "./context/NotificationContext";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useCallerProfile } from "./hooks/useQueries";
import { needsTermsAcceptance } from "./utils/termsStorage";

import Footer from "./components/Footer";
import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminResetPage from "./pages/AdminResetPage";
import CartPage from "./pages/CartPage";
import CreateStorePage from "./pages/CreateStorePage";
import CustomerDashboard from "./pages/CustomerDashboard";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import EmailLoginPage from "./pages/EmailLoginPage";
import GlobalSearchPage from "./pages/GlobalSearchPage";
import LandingPage from "./pages/LandingPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import RoleSelectionPage from "./pages/RoleSelectionPage";
import StoreDetailPage from "./pages/StoreDetailPage";
import StoreListPage from "./pages/StoreListPage";
import TermsPage from "./pages/TermsPage";
import VendorDashboard from "./pages/VendorDashboard";

// ── Error Boundary ──────────────────────────────────────────────────────────
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary] Caught:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            padding: "24px",
            backgroundColor: "#f9fafb",
            textAlign: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "32px 24px",
              boxShadow: "0 2px 16px rgba(0,0,0,0.1)",
              maxWidth: "360px",
              width: "100%",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "24px",
              }}
            >
              ⚠️
            </div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#111827",
                marginBottom: "8px",
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "20px",
                lineHeight: "1.5",
              }}
            >
              Riva encountered an unexpected error. Tap below to try again.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              data-ocid="error_boundary.retry_button"
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                backgroundColor: "#16a34a",
                color: "#ffffff",
                border: "none",
                fontWeight: 700,
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Root Layout with auth logic & keep-alive ─────────────────────────────
function RootLayout() {
  const { identity, clear } = useInternetIdentity();
  const { actor, isFetching: actorFetching } = useActor();
  const { setCurrentUser, logout } = useApp();
  const queryClient = useQueryClient();
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const _isAuthenticated = !!identity;

  const { data: userProfile, isFetched: profileFetched } = useCallerProfile();

  // Keep-alive: ping canister every 20s
  useEffect(() => {
    if (!actor) return;
    const ping = () => {
      actor.generateOtp("0000000000").catch((e: unknown) => {
        console.warn("[KeepAlive] Ping failed:", e);
      });
    };
    ping();
    keepAliveRef.current = setInterval(ping, 20_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") ping();
    };
    const handleWindowFocus = () => ping();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    return () => {
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [actor]);

  // Sync user profile into context
  useEffect(() => {
    if (userProfile && !actorFetching && profileFetched) {
      setCurrentUser(userProfile);
    }
  }, [userProfile, actorFetching, profileFetched, setCurrentUser]);

  const handleLogout = useCallback(async () => {
    await clear();
    queryClient.clear();
    logout();
    window.location.href = "/";
  }, [clear, queryClient, logout]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onLogout={handleLogout} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AppProvider>
          <CartProvider>{children}</CartProvider>
        </AppProvider>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

function ProvidersWithLayout() {
  return (
    <Providers>
      <RootLayout />
    </Providers>
  );
}

// ── Route Definitions ────────────────────────────────────────────────────
const rootRoute = createRootRoute({
  component: ProvidersWithLayout,
});

// Public routes
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: EmailLoginPage,
});

const roleSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/role-setup",
  component: RoleSelectionPage,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: TermsPage,
});

const adminResetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin-reset",
  component: AdminResetPage,
});

// Helper: check if a user session likely exists (synchronous, heuristic)
// Internet Identity session restoration is async, so we only hard-redirect
// when there is clearly no stored session indicator at all.
function isLikelyAuthenticated(): boolean {
  try {
    // riva_user_name is set on login and cleared on logout
    return !!localStorage.getItem("riva_user_name");
  } catch {
    // localStorage unavailable — allow through, page will handle null state
    return true;
  }
}

// Customer routes
const customerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customer",
  beforeLoad: () => {
    if (!isLikelyAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: CustomerDashboard,
});

const customerCartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customer/cart",
  beforeLoad: () => {
    if (!isLikelyAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: CartPage,
});

const customerSearchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customer/search",
  beforeLoad: () => {
    if (!isLikelyAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: GlobalSearchPage,
});

const customerStoreListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customer/stores",
  beforeLoad: () => {
    if (!isLikelyAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: StoreListPage,
});

const customerStoreDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customer/store/$storeId",
  beforeLoad: () => {
    if (!isLikelyAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: StoreDetailPage,
});

const customerTrackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customer/track/$orderId",
  beforeLoad: () => {
    if (!isLikelyAuthenticated()) {
      throw redirect({ to: "/login" });
    }
  },
  component: OrderTrackingPage,
});

// Vendor routes
const vendorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/vendor",
  component: () => (
    <ProtectedRoute
      dashboardRole="vendor"
      onCancel={() => {
        window.location.href = "/";
      }}
    >
      <VendorDashboard />
    </ProtectedRoute>
  ),
});

const vendorCreateStoreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/vendor/create-store",
  component: () => (
    <ProtectedRoute
      dashboardRole="vendor"
      onCancel={() => {
        window.location.href = "/";
      }}
    >
      <CreateStorePage />
    </ProtectedRoute>
  ),
});

// Delivery route
const deliveryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/delivery",
  component: () => (
    <ProtectedRoute
      dashboardRole="delivery"
      onCancel={() => {
        window.location.href = "/";
      }}
    >
      <DeliveryDashboard />
    </ProtectedRoute>
  ),
});

// Catch-all
const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  component: () => {
    throw redirect({ to: "/" });
  },
});

// ── Router ───────────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  landingRoute,
  loginRoute,
  roleSetupRoute,
  termsRoute,
  adminResetRoute,
  customerRoute,
  customerCartRoute,
  customerSearchRoute,
  customerStoreListRoute,
  customerStoreDetailRoute,
  customerTrackRoute,
  vendorRoute,
  vendorCreateStoreRoute,
  deliveryRoute,
  catchAllRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function RouterApp() {
  return <RouterProvider router={router} />;
}
