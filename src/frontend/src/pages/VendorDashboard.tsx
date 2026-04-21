import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart2,
  Bell,
  CheckCircle2,
  Edit2,
  Loader2,
  LogOut,
  Package,
  PackagePlus,
  Power,
  RefreshCw,
  Save,
  Store,
  Timer,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { type Order, OrderStatus, type Product } from "../backend";
import ConfirmModal from "../components/ConfirmModal";
import { ImageUploadField } from "../components/ImageUploadField";
import VendorAnalyticsDashboard from "../components/VendorAnalyticsDashboard";
import { useApp } from "../context/AppContext";
import { useNotifications } from "../context/NotificationContext";
import { formatCountdown, useOrderCountdown } from "../hooks/useOrderCountdown";
import {
  useAddProduct,
  useAllProducts,
  useDeleteProduct,
  useOrdersByStatus,
  useStoreByVendor,
  useToggleStoreOpen,
  useUpdateOrderStatus,
  useUpdateProduct,
  useVendorProducts,
} from "../hooks/useQueries";

type TabId = "orders" | "products" | "analytics";

interface EditState {
  name: string;
  description: string;
  price: string;
  image: string;
}

function ProductManageCard({
  product,
  idx,
  onEdit,
  onDelete,
}: {
  product: Product;
  idx: number;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  const imgSrc =
    product.image && product.image.trim() !== ""
      ? product.image
      : `https://picsum.photos/seed/${product.productId}/200/140`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * idx }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      data-ocid={`products.item.${idx + 1}`}
    >
      <div className="flex gap-3 p-3">
        <img
          src={imgSrc}
          alt={product.name}
          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://picsum.photos/seed/${product.productId}/200/140`;
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 truncate">
            {product.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {product.description}
          </p>
          <p className="font-extrabold text-sm text-green-600 mt-1">
            ₹{product.price}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(product)}
            className="h-7 w-7 p-0 border-gray-300 text-gray-600 hover:bg-gray-50"
            data-ocid={`products.edit_button.${idx + 1}`}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(product)}
            className="h-7 w-7 p-0 border-red-200 text-red-500 hover:bg-red-50"
            data-ocid={`products.delete_button.${idx + 1}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function EditProductCard({
  product,
  idx,
  onSave,
  onCancel,
  isSaving,
}: {
  product: Product;
  idx: number;
  onSave: (productId: bigint, data: EditState) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<EditState>({
    name: product.name,
    description: product.description,
    price: product.price.toString(),
    image: product.image,
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl border-2 border-green-400 shadow-md p-3 space-y-2"
      data-ocid={`products.item.${idx + 1}`}
    >
      <p className="text-xs font-bold text-green-600 uppercase tracking-wide">
        Editing Product
      </p>
      <div className="space-y-2">
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Product name"
          className="text-sm border-gray-300"
          data-ocid={`products.item.${idx + 1}.input`}
        />
        <Input
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          placeholder="Description"
          className="text-sm border-gray-300"
        />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-semibold">
            ₹
          </span>
          <Input
            type="number"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="Price"
            className="text-sm border-gray-300 pl-7"
          />
        </div>
        <ImageUploadField
          value={form.image}
          onChange={(url) => setForm((f) => ({ ...f, image: url }))}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => onSave(product.productId, form)}
          disabled={isSaving}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs gap-1"
          data-ocid={`products.save_button.${idx + 1}`}
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="flex-1 text-xs gap-1 border-gray-300"
          data-ocid={`products.cancel_button.${idx + 1}`}
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}

function ManageProductsSection({
  storeId,
  vendorId,
  onConfirm,
}: {
  storeId: bigint;
  vendorId: string;
  onConfirm: (message: string, action: () => void) => void;
}) {
  const isAnonymous = !vendorId || vendorId === "anonymous";
  const vendorQuery = useVendorProducts(isAnonymous ? undefined : vendorId);
  const allQuery = useAllProducts();
  const { data: products = [], isLoading } = isAnonymous
    ? allQuery
    : vendorQuery;

  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
  });
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!form.name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      setFormError("Enter a valid price.");
      return;
    }
    setFormError("");
    try {
      await addProduct.mutateAsync({
        storeId,
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        image: form.image.trim(),
      });
      setForm({ name: "", description: "", price: "", image: "" });
      toast.success("Product added!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to add product.");
    }
  };

  const handleSaveEdit = async (productId: bigint, data: EditState) => {
    if (!data.name.trim()) {
      toast.error("Product name required.");
      return;
    }
    if (!data.price || Number(data.price) <= 0) {
      toast.error("Enter a valid price.");
      return;
    }
    try {
      await updateProduct.mutateAsync({
        productId,
        name: data.name.trim(),
        description: data.description.trim(),
        price: Number(data.price),
        image: data.image.trim(),
      });
      setEditingId(null);
      toast.success("Product updated!");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update product.");
    }
  };

  const handleDelete = (product: Product) => {
    onConfirm(`Delete "${product.name}"? This cannot be undone.`, async () => {
      try {
        await deleteProduct.mutateAsync(product.productId);
        toast.success(`"${product.name}" deleted.`);
      } catch (e: any) {
        toast.error(e?.message || "Failed to delete product.");
      }
    });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <PackagePlus className="w-5 h-5 text-green-600" />
        <h2 className="text-lg font-bold text-gray-900">Manage Products</h2>
      </div>

      {/* Add Product Form */}
      <Card
        className="mb-4 border-green-200 shadow-sm"
        data-ocid="products.panel"
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <PackagePlus className="w-4 h-4 text-green-600" />
            Add New Product
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-semibold text-gray-700">
                Product Name *
              </Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setFormError("");
                }}
                placeholder="e.g. Fresh Tomatoes"
                className="mt-1 text-sm border-gray-300"
                data-ocid="products.input"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">
                Description
              </Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Short description"
                className="mt-1 text-sm border-gray-300"
                data-ocid="products.textarea"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">
                Price (₹) *
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-semibold">
                  ₹
                </span>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                  placeholder="0"
                  className="pl-7 text-sm border-gray-300"
                  min="0"
                  data-ocid="products.price.input"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">
                Product Image
              </Label>
              <div className="mt-1">
                <ImageUploadField
                  value={form.image}
                  onChange={(url) => setForm((f) => ({ ...f, image: url }))}
                  onError={(msg) => setFormError(msg)}
                />
              </div>
            </div>
          </div>
          {formError && (
            <p
              className="text-xs text-red-600 font-semibold"
              data-ocid="products.error_state"
            >
              {formError}
            </p>
          )}
          <Button
            onClick={handleAdd}
            disabled={addProduct.isPending}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold gap-2"
            data-ocid="products.primary_button"
          >
            {addProduct.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Adding...
              </>
            ) : (
              <>
                <PackagePlus className="w-4 h-4" /> Add Product
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Product List */}
      <h3 className="text-sm font-bold text-gray-700 mb-2">
        Your Products ({products.length})
      </h3>
      {isLoading ? (
        <div
          className="flex items-center gap-2 text-gray-500 text-sm py-4"
          data-ocid="products.loading_state"
        >
          <Loader2 className="w-4 h-4 animate-spin" /> Loading products...
        </div>
      ) : products.length === 0 ? (
        <div
          className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-xl"
          data-ocid="products.empty_state"
        >
          No products yet. Add your first product above!
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product, i) => {
            const id = product.productId.toString();
            return editingId === id ? (
              <EditProductCard
                key={id}
                product={product}
                idx={i}
                onSave={handleSaveEdit}
                onCancel={() => setEditingId(null)}
                isSaving={updateProduct.isPending}
              />
            ) : (
              <ProductManageCard
                key={id}
                product={product}
                idx={i}
                onEdit={(p) => setEditingId(p.productId.toString())}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function PendingOrderCountdown({ orderId }: { orderId: string }) {
  const { secondsLeft, isExpired } = useOrderCountdown(orderId);
  if (isExpired) return null;
  return (
    <div className="mt-2 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
      <Timer className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
      <span className="text-xs font-bold text-amber-700">
        Accept within{" "}
        <span className="font-mono tabular-nums">
          {formatCountdown(secondsLeft)}
        </span>
      </span>
    </div>
  );
}

function isOrderExpiredLocally(orderId: string): boolean {
  try {
    const timestamps: Record<string, number> = JSON.parse(
      localStorage.getItem("riva_order_timestamps") || "{}",
    );
    const createdAt = timestamps[orderId];
    if (!createdAt) return false;
    return Date.now() - createdAt > 5 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function VendorDashboard() {
  const { currentUser, navigate } = useApp();
  const { addNotification } = useNotifications();
  const vendorId = currentUser?.id?.toString() || "anonymous";

  const [activeTab, setActiveTab] = useState<TabId>("orders");

  // ── Store check ──────────────────────────────────────────────────────────────
  const { data: store, isLoading: storeLoading } = useStoreByVendor(
    vendorId === "anonymous" ? undefined : vendorId,
  );
  const toggleStore = useToggleStoreOpen();

  const {
    data: requestedOrders = [],
    isLoading,
    refetch,
  } = useOrdersByStatus(OrderStatus.requested);
  const { data: confirmedOrders = [] } = useOrdersByStatus(
    OrderStatus.storeConfirmed,
  );
  const updateStatus = useUpdateOrderStatus();
  const [declining, setDeclining] = useState<Set<string>>(new Set());
  const [expiredOrderIds, setExpiredOrderIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("riva_expired_orders");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    message: string;
    action: (() => void) | null;
  }>({ open: false, message: "", action: null });

  // ── Sound + notification state ─────────────────────────────────────────────
  const orderSound = useRef(
    new Audio("https://www.soundjay.com/buttons/sounds/button-3.mp3"),
  );
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showNewOrderPopup, setShowNewOrderPopup] = useState(false);
  const prevOrderCount = useRef(-1);

  // Unlock audio on first user click
  useEffect(() => {
    const unlock = () => {
      orderSound.current
        .play()
        .then(() => {
          orderSound.current.pause();
          orderSound.current.currentTime = 0;
          setAudioUnlocked(true);
        })
        .catch(() => {
          setAudioUnlocked(true);
        });
    };
    document.addEventListener("click", unlock, { once: true });
    return () => document.removeEventListener("click", unlock);
  }, []);

  // Sync expired orders from localStorage every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem("riva_expired_orders");
        if (stored) {
          const ids = new Set<string>(JSON.parse(stored));
          for (const order of requestedOrders) {
            const idStr = order.id.toString();
            if (!ids.has(idStr) && isOrderExpiredLocally(idStr)) {
              ids.add(idStr);
              localStorage.setItem(
                "riva_expired_orders",
                JSON.stringify([...ids]),
              );
            }
          }
          setExpiredOrderIds(ids);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [requestedOrders]);

  const visibleRequested = requestedOrders.filter(
    (o) => !declining.has(o.id.toString()),
  );

  // Detect new orders
  useEffect(() => {
    const count = visibleRequested.length;
    if (prevOrderCount.current === -1) {
      prevOrderCount.current = count;
      return;
    }
    if (count > prevOrderCount.current) {
      if (audioUnlocked) {
        orderSound.current.currentTime = 0;
        orderSound.current.play().catch(() => {});
      }
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      setShowNewOrderPopup(true);
      setTimeout(() => setShowNewOrderPopup(false), 4000);
      addNotification({
        title: "Riva: New Order Received 🔥",
        message: `You have ${count} pending order${count > 1 ? "s" : ""}`,
        type: "order",
      });
    }
    prevOrderCount.current = count;
  }, [visibleRequested.length, audioUnlocked, addNotification]);

  // Repeat sound every 5s while pending orders exist
  useEffect(() => {
    const interval = setInterval(() => {
      if (visibleRequested.length > 0 && audioUnlocked) {
        orderSound.current.currentTime = 0;
        orderSound.current.play().catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [visibleRequested.length, audioUnlocked]);

  const handleAccept = (order: Order) => {
    setConfirmModal({
      open: true,
      message: `Accept order for "${order.itemName}"?`,
      action: async () => {
        try {
          await updateStatus.mutateAsync({
            orderId: order.id,
            status: OrderStatus.storeConfirmed,
          });
          toast.success(`Order for "${order.itemName}" accepted!`);
        } catch (e: any) {
          toast.error(e?.message || "Failed to accept order.");
        }
      },
    });
  };

  const handleDecline = (order: Order) => {
    setDeclining((prev) => new Set([...prev, order.id.toString()]));
    toast.info(`Order for "${order.itemName}" declined.`);
  };

  const handleOpenConfirm = (message: string, action: () => void) => {
    setConfirmModal({ open: true, message, action });
  };

  const handleConfirm = () => {
    confirmModal.action?.();
    setConfirmModal({ open: false, message: "", action: null });
  };

  const handleCancel = () => {
    setConfirmModal({ open: false, message: "", action: null });
  };

  const handleLogout = () => {
    localStorage.removeItem("vendorAccess");
    navigate("landing");
  };

  const handleToggleStore = async () => {
    if (!store) return;
    try {
      const isOpen = await toggleStore.mutateAsync(store.storeId);
      toast.success(isOpen ? "Store is now Open" : "Store is now Closed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to toggle store.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {/* New Order Popup */}
      <AnimatePresence>
        {showNewOrderPopup && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
            data-ocid="vendor.toast"
          >
            <div className="bg-green-500 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">New Order Received!</p>
                <p className="text-xs text-green-100">
                  Check incoming requests below
                </p>
              </div>
              <button
                onClick={() => setShowNewOrderPopup(false)}
                className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                type="button"
                data-ocid="vendor.close_button"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Vendor Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentUser?.name || "Store Vendor"} · Manage your store
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
            data-ocid="vendor.refresh.button"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            data-ocid="vendor.logout.button"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </Button>
        </div>
      </div>

      {/* ── Store Section ── */}
      {storeLoading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading store info...
        </div>
      ) : !store ? (
        /* No store — show Create CTA */
        <Card
          className="mb-8 border-dashed border-2 border-green-300 bg-green-50"
          data-ocid="vendor.create_store.card"
        >
          <CardContent className="py-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
              <Store className="w-8 h-8 text-green-500" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-extrabold text-gray-900">
                Create Your Store
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Set up your store to start selling to local customers
              </p>
            </div>
            <Button
              onClick={() => navigate("create-store")}
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 rounded-xl"
              data-ocid="vendor.create_store.primary_button"
            >
              <Store className="w-4 h-4 mr-2" />
              Create Store
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Has store — show store header + tabs */
        <>
          <Card
            className="mb-6 border-green-200 bg-green-50/50"
            data-ocid="vendor.store.card"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {store.image ? (
                      <img
                        src={store.image}
                        alt={store.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Store className="w-6 h-6 text-green-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-gray-900">
                      {store.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {store.category} · {store.deliveryTime}
                    </p>
                    <Badge
                      className={`mt-1 text-[10px] ${
                        store.isOpen
                          ? "bg-green-500 text-white border-0"
                          : "bg-gray-200 text-gray-600 border-0"
                      }`}
                    >
                      {store.isOpen ? "OPEN" : "CLOSED"}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToggleStore}
                  disabled={toggleStore.isPending}
                  className={`gap-1.5 text-xs font-bold ${
                    store.isOpen
                      ? "border-red-200 text-red-600 hover:bg-red-50"
                      : "border-green-200 text-green-600 hover:bg-green-50"
                  }`}
                  data-ocid="vendor.store.toggle"
                >
                  <Power className="w-3.5 h-3.5" />
                  {store.isOpen ? "Close Store" : "Open Store"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div
            className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6"
            data-ocid="vendor.tabs"
          >
            {(
              [
                {
                  id: "orders" as TabId,
                  label: "Orders",
                  icon: <Package className="w-3.5 h-3.5" />,
                },
                {
                  id: "products" as TabId,
                  label: "Products",
                  icon: <PackagePlus className="w-3.5 h-3.5" />,
                },
                {
                  id: "analytics" as TabId,
                  label: "Analytics",
                  icon: <BarChart2 className="w-3.5 h-3.5" />,
                },
              ] as { id: TabId; label: string; icon: React.ReactNode }[]
            ).map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                data-ocid={`vendor.tab.${id}`}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-2 rounded-lg transition-all duration-200 ${
                  activeTab === id
                    ? "bg-white text-green-700 shadow-sm font-bold"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Tab: Products */}
          {activeTab === "products" && (
            <ManageProductsSection
              storeId={store.storeId}
              vendorId={vendorId}
              onConfirm={handleOpenConfirm}
            />
          )}

          {/* Tab: Analytics */}
          {activeTab === "analytics" && (
            <VendorAnalyticsDashboard storeId={store.storeId} />
          )}

          {/* Tab: Orders */}
          {activeTab === "orders" && (
            <>
              {/* Incoming Requests */}
              <div className="mb-8">
                <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Incoming Requests
                  <span className="text-sm font-normal text-muted-foreground">
                    ({visibleRequested.length})
                  </span>
                  {visibleRequested.length > 0 && (
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  )}
                </h2>

                {isLoading ? (
                  <div
                    className="flex items-center gap-2 text-muted-foreground text-sm py-4"
                    data-ocid="vendor.orders.loading_state"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading
                    orders...
                  </div>
                ) : visibleRequested.length === 0 ? (
                  <div
                    className="text-center py-10 text-muted-foreground text-sm bg-muted/50 rounded-xl"
                    data-ocid="vendor.orders.empty_state"
                  >
                    No pending orders. Check back soon!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleRequested.map((order, i) => (
                      <motion.div
                        key={order.id.toString()}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: 0.05 * i }}
                        data-ocid={`vendor.orders.item.${i + 1}`}
                      >
                        <Card className="shadow-card border-border">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Package className="w-4 h-4 text-warning" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-foreground">
                                  {order.itemName}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Order #{order.id.toString()}
                                </p>
                                {order.customerName && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Customer: {order.customerName}
                                  </p>
                                )}
                                <Badge
                                  variant="outline"
                                  className="mt-1.5 text-xs bg-warning/10 text-warning border-warning/20"
                                >
                                  Awaiting confirmation
                                </Badge>
                              </div>
                            </div>
                            {!expiredOrderIds.has(order.id.toString()) && (
                              <PendingOrderCountdown
                                orderId={order.id.toString()}
                              />
                            )}
                            {expiredOrderIds.has(order.id.toString()) ? (
                              <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                <span className="text-xs font-bold text-red-600">
                                  Order Expired — No longer available
                                </span>
                              </div>
                            ) : (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  onClick={() => handleAccept(order)}
                                  disabled={updateStatus.isPending}
                                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs"
                                  data-ocid={`vendor.accept.button.${i + 1}`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDecline(order)}
                                  className="flex-1 gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/5"
                                  data-ocid={`vendor.decline.button.${i + 1}`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Decline
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirmed Orders */}
              <div>
                <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Confirmed Orders ({confirmedOrders.length})
                </h2>
                {confirmedOrders.length === 0 ? (
                  <div
                    className="text-center py-6 text-muted-foreground text-sm bg-muted/50 rounded-xl"
                    data-ocid="vendor.confirmed.empty_state"
                  >
                    No confirmed orders yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {confirmedOrders.map((order, i) => (
                      <div
                        key={order.id.toString()}
                        className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
                        data-ocid={`vendor.confirmed.item.${i + 1}`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {order.itemName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            #{order.id.toString()}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                        >
                          Confirmed
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
