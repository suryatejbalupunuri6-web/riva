import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "@tanstack/react-router";
import {
  BarChart2,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Edit2,
  Loader2,
  LogOut,
  MapPin,
  Package,
  PackagePlus,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Save,
  Store,
  Timer,
  Trash2,
  Truck,
  User,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type Order,
  OrderStatus,
  type Product,
  type Store as StoreType,
} from "../backend";
import ConfirmModal from "../components/ConfirmModal";
import { ImageUrlGenerator } from "../components/ImageUrlGenerator";
import PriceDisplay from "../components/PriceDisplay";
import VendorAnalyticsDashboard from "../components/VendorAnalyticsDashboard";
import { useApp } from "../context/AppContext";
import { useNotifications } from "../context/NotificationContext";
import { formatCountdown, useOrderCountdown } from "../hooks/useOrderCountdown";
import {
  useAddProduct,
  useAllProducts,
  useDeleteProduct,
  useOrdersByStore,
  useStoresByVendor,
  useToggleStoreOpen,
  useUpdateOrderStatus,
  useUpdateProduct,
  useVendorProducts,
} from "../hooks/useQueries";

const UNIFIED_CATEGORIES = [
  "Stationery",
  "Grocery",
  "Fruits",
  "Fashion",
  "Toys",
];

const SELECTED_STORE_KEY = "riva_vendor_selected_store";

type TabId = "orders" | "products" | "analytics";

interface EditState {
  name: string;
  description: string;
  originalPrice: string;
  sellingPrice: string;
  imageUrl: string;
  category: string;
}

// ── Sub-components ────────────────────────────────────────────────────────

function ProductManageCard({
  product,
  idx,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  product: Product;
  idx: number;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onDuplicate: (product: Product) => void;
}) {
  const imgSrc =
    product.imageUrl && product.imageUrl.trim() !== ""
      ? product.imageUrl
      : `https://picsum.photos/seed/${product.id}/200/140`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * idx }}
      className="bg-card rounded-xl border border-border shadow-sm overflow-hidden"
      data-ocid={`products.item.${idx + 1}`}
    >
      <div className="flex gap-3 p-3">
        <img
          src={imgSrc}
          alt={product.name}
          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://picsum.photos/seed/${product.id}/200/140`;
          }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground truncate">
            {product.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {product.description}
          </p>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <PriceDisplay
              sellingPrice={product.sellingPrice ?? product.price}
              originalPrice={product.originalPrice}
              size="sm"
            />
            {product.category && (
              <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border border-primary/20 font-semibold">
                {product.category}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onEdit(product)}
            className="h-7 w-7 p-0 border-border text-muted-foreground hover:bg-muted"
            data-ocid={`products.edit_button.${idx + 1}`}
            aria-label="Edit product"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDuplicate(product)}
            className="h-7 w-7 p-0 border-border text-muted-foreground hover:bg-muted"
            data-ocid={`products.duplicate_button.${idx + 1}`}
            aria-label="Duplicate product"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(product)}
            className="h-7 w-7 p-0 border-destructive/30 text-destructive hover:bg-destructive/5"
            data-ocid={`products.delete_button.${idx + 1}`}
            aria-label="Delete product"
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
  onSave: (productId: string, data: EditState) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<EditState>({
    name: product.name,
    description: product.description,
    originalPrice:
      product.originalPrice != null ? product.originalPrice.toString() : "",
    sellingPrice:
      product.sellingPrice != null
        ? product.sellingPrice.toString()
        : product.price.toString(),
    imageUrl: product.imageUrl ?? "",
    category: product.category ?? "",
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-card rounded-xl border-2 border-primary/50 shadow-md p-3 space-y-2"
      data-ocid={`products.item.${idx + 1}`}
    >
      <p className="text-xs font-bold text-primary uppercase tracking-wide">
        Editing Product
      </p>
      <div className="space-y-2">
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Product name"
          className="text-sm"
          data-ocid={`products.item.${idx + 1}.input`}
        />
        <Input
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          placeholder="Description"
          className="text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">
              Original Price (₹)
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                ₹
              </span>
              <Input
                type="number"
                value={form.originalPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, originalPrice: e.target.value }))
                }
                placeholder="0"
                className="text-sm pl-6"
                min="0"
                data-ocid={`products.original_price.${idx + 1}.input`}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">
              Selling Price (₹) *
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">
                ₹
              </span>
              <Input
                type="number"
                value={form.sellingPrice}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sellingPrice: e.target.value }))
                }
                placeholder="0"
                className="text-sm pl-6"
                min="0"
                data-ocid={`products.selling_price.${idx + 1}.input`}
              />
            </div>
          </div>
        </div>
        {form.sellingPrice && (
          <div className="text-xs text-muted-foreground">
            Preview:{" "}
            <PriceDisplay
              sellingPrice={Number(form.sellingPrice)}
              originalPrice={
                form.originalPrice ? Number(form.originalPrice) : undefined
              }
              size="sm"
            />
          </div>
        )}
        <ImageUrlGenerator
          value={form.imageUrl}
          onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
        />
        <div>
          <Label className="text-xs font-semibold text-muted-foreground">
            Category *
          </Label>
          <Select
            value={form.category}
            onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
          >
            <SelectTrigger
              className="mt-1 text-sm"
              data-ocid={`products.category.${idx + 1}.select`}
            >
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {UNIFIED_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => onSave(product.id, form)}
          disabled={isSaving}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1"
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
          className="flex-1 text-xs gap-1"
          data-ocid={`products.cancel_button.${idx + 1}`}
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}

function SuggestionRow({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors duration-150"
    >
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-7 h-7 rounded-md object-cover flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="w-7 h-7 rounded-md bg-muted flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {product.name}
        </p>
        <PriceDisplay
          sellingPrice={product.sellingPrice ?? product.price}
          originalPrice={product.originalPrice}
          size="sm"
        />
      </div>
    </button>
  );
}

function ManageProductsSection({
  storeId,
  vendorId,
  onConfirm,
}: {
  storeId: string;
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
    originalPrice: "",
    sellingPrice: "",
    imageUrl: "",
    category: "",
  });
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const suggestions =
    form.name.trim().length >= 1
      ? products
          .filter((p) => p.name.toLowerCase().includes(form.name.toLowerCase()))
          .slice(0, 5)
      : [];

  const showSuggestions = nameFocused && suggestions.length > 0;

  const applySuggestion = (p: Product) => {
    setForm({
      name: p.name,
      description: p.description,
      originalPrice: p.originalPrice != null ? p.originalPrice.toString() : "",
      sellingPrice: (p.sellingPrice ?? p.price).toString(),
      imageUrl: p.imageUrl ?? "",
      category: p.category ?? "",
    });
    setNameFocused(false);
    setFormError("");
  };

  const applyDuplicate = (p: Product) => {
    setEditingId(null);
    setForm({
      name: `Copy of ${p.name}`,
      description: p.description,
      originalPrice: p.originalPrice != null ? p.originalPrice.toString() : "",
      sellingPrice: (p.sellingPrice ?? p.price).toString(),
      imageUrl: p.imageUrl ?? "",
      category: p.category ?? "",
    });
    setFormError("");
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const effectiveSellingPrice = form.sellingPrice
    ? Number(form.sellingPrice)
    : null;
  const effectiveOriginalPrice = form.originalPrice
    ? Number(form.originalPrice)
    : null;

  const handleAdd = async () => {
    if (!form.name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    const sp = Number(form.sellingPrice);
    if (!sp || sp <= 0) {
      setFormError("Enter a valid selling price.");
      return;
    }
    if (!form.category.trim()) {
      setFormError("Please select a product category.");
      return;
    }
    if (!form.imageUrl.trim()) {
      setFormError("Please upload a product image first.");
      return;
    }
    setFormError("");
    try {
      const op = form.originalPrice ? Number(form.originalPrice) : sp;
      await addProduct.mutateAsync({
        storeId,
        name: form.name.trim(),
        description: form.description.trim(),
        price: sp,
        image: form.imageUrl.trim(),
        originalPrice: op,
        sellingPrice: sp,
        category: form.category.trim(),
      });
      setForm({
        name: "",
        description: "",
        originalPrice: "",
        sellingPrice: "",
        imageUrl: "",
        category: "",
      });
      toast.success("Product added!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add product.");
    }
  };

  const handleSaveEdit = async (productId: string, data: EditState) => {
    if (!data.name.trim()) {
      toast.error("Product name required.");
      return;
    }
    const sp = Number(data.sellingPrice);
    if (!sp || sp <= 0) {
      toast.error("Enter a valid selling price.");
      return;
    }
    if (!data.category.trim()) {
      toast.error("Please select a product category");
      return;
    }
    const op = data.originalPrice ? Number(data.originalPrice) : sp;
    try {
      await updateProduct.mutateAsync({
        productId,
        name: data.name.trim(),
        description: data.description.trim(),
        price: sp,
        image: data.imageUrl.trim(),
        originalPrice: op,
        sellingPrice: sp,
        category: data.category.trim(),
      });
      setEditingId(null);
      toast.success("Product updated!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update product.");
    }
  };

  const handleDelete = (product: Product) => {
    onConfirm(`Delete "${product.name}"? This cannot be undone.`, async () => {
      try {
        await deleteProduct.mutateAsync(product.id);
        toast.success(`"${product.name}" deleted.`);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Failed to delete product.",
        );
      }
    });
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <PackagePlus className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Manage Products</h2>
      </div>

      <Card className="mb-4 border-border shadow-sm" data-ocid="products.panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <PackagePlus className="w-4 h-4 text-primary" />
            Add New Product
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <Label className="text-xs font-semibold text-muted-foreground">
                Product Name *
              </Label>
              <Input
                ref={nameInputRef}
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  setFormError("");
                }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setTimeout(() => setNameFocused(false), 150)}
                placeholder='e.g. "ox pen", "fresh tomatoes"'
                className="mt-1 text-sm"
                data-ocid="products.input"
                autoComplete="off"
              />
              {showSuggestions && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map((p) => (
                    <SuggestionRow
                      key={p.id}
                      product={p}
                      onSelect={() => applySuggestion(p)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Description
              </Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Short description"
                className="mt-1 text-sm"
                data-ocid="products.textarea"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Original Price (₹)
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                  ₹
                </span>
                <Input
                  type="number"
                  value={form.originalPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, originalPrice: e.target.value }))
                  }
                  placeholder="0"
                  className="pl-7 text-sm"
                  min="0"
                  data-ocid="products.original_price.input"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground">
                Selling Price (₹) *
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                  ₹
                </span>
                <Input
                  type="number"
                  value={form.sellingPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sellingPrice: e.target.value }))
                  }
                  placeholder="0"
                  className="pl-7 text-sm"
                  min="0"
                  data-ocid="products.price.input"
                />
              </div>
            </div>
          </div>

          {effectiveSellingPrice !== null && effectiveSellingPrice > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <span>Price preview:</span>
              <PriceDisplay
                sellingPrice={effectiveSellingPrice}
                originalPrice={effectiveOriginalPrice ?? undefined}
                size="sm"
              />
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-muted-foreground">
              Product Image *
            </Label>
            <div className="mt-1">
              <ImageUrlGenerator
                value={form.imageUrl}
                onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                label="Product Image URL"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground">
              Category *
            </Label>
            <Select
              value={form.category}
              onValueChange={(v) => {
                setForm((f) => ({ ...f, category: v }));
                setFormError("");
              }}
            >
              <SelectTrigger
                className="mt-1 text-sm"
                data-ocid="products.category.select"
              >
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {UNIFIED_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formError && (
            <p
              className="text-xs text-destructive font-semibold"
              data-ocid="products.error_state"
            >
              {formError}
            </p>
          )}
          <Button
            onClick={handleAdd}
            disabled={addProduct.isPending}
            className="w-full font-semibold gap-2"
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

      <h3 className="text-sm font-bold text-muted-foreground mb-2">
        Your Products ({products.length})
      </h3>
      {isLoading ? (
        <div
          className="flex items-center gap-2 text-muted-foreground text-sm py-4"
          data-ocid="products.loading_state"
        >
          <Loader2 className="w-4 h-4 animate-spin" /> Loading products...
        </div>
      ) : products.length === 0 ? (
        <div
          className="text-center py-8 text-muted-foreground text-sm bg-muted/30 rounded-xl"
          data-ocid="products.empty_state"
        >
          No products yet. Add your first product above!
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product, i) =>
            editingId === product.id ? (
              <EditProductCard
                key={product.id}
                product={product}
                idx={i}
                onSave={handleSaveEdit}
                onCancel={() => setEditingId(null)}
                isSaving={updateProduct.isPending}
              />
            ) : (
              <ProductManageCard
                key={product.id}
                product={product}
                idx={i}
                onEdit={(p) => setEditingId(p.id)}
                onDelete={handleDelete}
                onDuplicate={applyDuplicate}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ── Countdown timer component with color states ─────────────────────────
function PendingCountdownBadge({ orderId }: { orderId: string }) {
  const { secondsLeft, isExpired } = useOrderCountdown(orderId);
  if (isExpired) return null;
  const isUrgent = secondsLeft < 60;
  const isWarning = secondsLeft < 180;
  const colorClass = isUrgent
    ? "bg-destructive/10 border-destructive/30 text-destructive"
    : isWarning
      ? "bg-amber-50 border-amber-200 text-amber-700"
      : "bg-emerald-50 border-emerald-200 text-emerald-700";

  return (
    <div
      className={`mt-2 flex items-center gap-1.5 border rounded-lg px-3 py-1.5 ${colorClass} ${isUrgent ? "animate-pulse" : ""}`}
    >
      <Timer className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-xs font-bold">
        Accept within{" "}
        <span className="font-mono tabular-nums">
          {formatCountdown(secondsLeft)}
        </span>
      </span>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────
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

function formatOrderItems(order: Order): string {
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items
      .map((item) => `${item.name} ×${item.quantity}`)
      .join(", ");
  }
  return "—";
}

// ── Store selector component ─────────────────────────────────────────────
function StoreSelector({
  stores,
  selectedId,
  onSelect,
  pendingByStore,
}: {
  stores: StoreType[];
  selectedId: string;
  onSelect: (id: string) => void;
  pendingByStore: Record<string, number>;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const selectedStore = stores.find((s) => s.id === selectedId);

  if (stores.length <= 3) {
    // Horizontal tabs
    return (
      <div
        className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide"
        data-ocid="vendor.store_selector"
      >
        {stores.map((store) => {
          const pendingCount = pendingByStore[store.id] ?? 0;
          const isActive = store.id === selectedId;
          return (
            <button
              key={store.id}
              type="button"
              onClick={() => onSelect(store.id)}
              data-ocid={`vendor.store_tab.${store.id}`}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              }`}
            >
              {store.imageUrl ? (
                <img
                  src={store.imageUrl}
                  alt={store.name}
                  className="w-5 h-5 rounded-md object-cover flex-shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <Store className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="max-w-[100px] truncate">{store.name}</span>
              {pendingCount > 0 && (
                <span
                  className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1 ${
                    isActive
                      ? "bg-amber-400 text-amber-900"
                      : "bg-destructive text-destructive-foreground"
                  }`}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown for 4+ stores
  return (
    <div className="relative" data-ocid="vendor.store_selector">
      <button
        type="button"
        onClick={() => setDropdownOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-card border border-border rounded-xl text-sm font-semibold hover:bg-muted/50 transition-colors"
        data-ocid="vendor.store_dropdown_trigger"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedStore?.imageUrl ? (
            <img
              src={selectedStore.imageUrl}
              alt={selectedStore.name}
              className="w-6 h-6 rounded-lg object-cover flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Store className="w-5 h-5 text-primary flex-shrink-0" />
          )}
          <span className="truncate">
            {selectedStore?.name ?? "Select store"}
          </span>
          {selectedStore && (pendingByStore[selectedStore.id] ?? 0) > 0 && (
            <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {pendingByStore[selectedStore.id]}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1 z-30 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
          >
            {stores.map((store) => {
              const pendingCount = pendingByStore[store.id] ?? 0;
              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => {
                    onSelect(store.id);
                    setDropdownOpen(false);
                  }}
                  data-ocid={`vendor.store_option.${store.id}`}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted transition-colors ${
                    store.id === selectedId
                      ? "bg-primary/5 text-primary font-bold"
                      : "text-foreground"
                  }`}
                >
                  {store.imageUrl ? (
                    <img
                      src={store.imageUrl}
                      alt={store.name}
                      className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Store className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="flex-1 text-sm truncate">{store.name}</span>
                  {pendingCount > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Orders Tab ───────────────────────────────────────────────────────────
function OrdersTab({
  storeId,
  onConfirm,
}: {
  storeId: string;
  onConfirm: (msg: string, action: () => void) => void;
}) {
  const {
    data: allStoreOrders = [],
    isLoading,
    refetch,
  } = useOrdersByStore(storeId);
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
  const [historyOpen, setHistoryOpen] = useState(false);

  // Split orders by status
  const pendingOrders = useMemo(
    () => allStoreOrders.filter((o) => o.status === OrderStatus.requested),
    [allStoreOrders],
  );
  const activeOrders = useMemo(
    () =>
      allStoreOrders.filter(
        (o) =>
          o.status === OrderStatus.storeConfirmed ||
          o.status === OrderStatus.riderAssigned ||
          o.status === OrderStatus.pickedUp,
      ),
    [allStoreOrders],
  );
  const historyOrders = useMemo(
    () =>
      allStoreOrders.filter(
        (o) =>
          o.status === OrderStatus.delivered ||
          o.status === OrderStatus.expired,
      ),
    [allStoreOrders],
  );

  // Track locally expired orders
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem("riva_expired_orders");
        const ids = new Set<string>(stored ? JSON.parse(stored) : []);
        let changed = false;
        for (const order of pendingOrders) {
          if (!ids.has(order.id) && isOrderExpiredLocally(order.id)) {
            ids.add(order.id);
            changed = true;
          }
        }
        if (changed) {
          localStorage.setItem("riva_expired_orders", JSON.stringify([...ids]));
          setExpiredOrderIds(new Set(ids));
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [pendingOrders]);

  // Visible pending: exclude declined and locally expired
  const visiblePending = pendingOrders.filter(
    (o) => !declining.has(o.id) && !expiredOrderIds.has(o.id),
  );

  const handleAccept = (order: Order) => {
    onConfirm(`Accept order for "${formatOrderItems(order)}"?`, async () => {
      try {
        await updateStatus.mutateAsync({
          orderId: order.id,
          status: OrderStatus.storeConfirmed,
        });
        toast.success("Order accepted!");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to accept order.");
      }
    });
  };

  const handleDecline = (order: Order) => {
    setDeclining((prev) => new Set([...prev, order.id]));
    toast.info("Order removed from your view.");
  };

  const handleMarkDelivered = (order: Order) => {
    onConfirm(
      `Mark order for "${formatOrderItems(order)}" as delivered?`,
      async () => {
        try {
          await updateStatus.mutateAsync({
            orderId: order.id,
            status: OrderStatus.delivered,
          });
          toast.success("Order marked as delivered!");
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Failed to update order.",
          );
        }
      },
    );
  };

  const statusLabel: Record<string, { label: string; className: string }> = {
    [OrderStatus.storeConfirmed]: {
      label: "Accepted",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    [OrderStatus.riderAssigned]: {
      label: "Rider Assigned",
      className: "bg-purple-50 text-purple-700 border-purple-200",
    },
    [OrderStatus.pickedUp]: {
      label: "Picked Up",
      className: "bg-orange-50 text-orange-700 border-orange-200",
    },
  };

  return (
    <div className="space-y-6">
      {/* Pending orders header counter */}
      {visiblePending.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
          data-ocid="vendor.pending_counter"
        >
          <Bell className="w-4 h-4 text-amber-600 animate-pulse flex-shrink-0" />
          <p className="text-sm font-bold text-amber-800">
            {visiblePending.length} order{visiblePending.length > 1 ? "s" : ""}{" "}
            waiting for your response
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-auto text-amber-600 hover:text-amber-800"
            aria-label="Refresh orders"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}

      {/* Pending Orders */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Incoming Requests
          <span className="text-sm font-normal text-muted-foreground">
            ({visiblePending.length})
          </span>
          {visiblePending.length > 0 && (
            <span className="w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
          )}
        </h2>

        {isLoading ? (
          <div
            className="flex items-center gap-2 text-muted-foreground text-sm py-4"
            data-ocid="vendor.orders.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" /> Loading orders...
          </div>
        ) : visiblePending.length === 0 ? (
          <div
            className="text-center py-10 text-muted-foreground text-sm bg-muted/50 rounded-xl"
            data-ocid="vendor.orders.empty_state"
          >
            No pending orders. Check back soon!
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {visiblePending.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -24, scale: 0.97 }}
                  transition={{ delay: 0.05 * i }}
                  data-ocid={`vendor.orders.item.${i + 1}`}
                >
                  <Card className="shadow-sm border-amber-200 border">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Package className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">
                            {formatOrderItems(order)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Order #{order.id.slice(-8)}
                          </p>
                          {order.customerName && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">
                                {order.customerName}
                              </p>
                            </div>
                          )}
                          {order.customerPhone && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <a
                                href={`tel:${order.customerPhone}`}
                                className="text-xs text-blue-600 underline underline-offset-1"
                              >
                                {order.customerPhone}
                              </a>
                            </div>
                          )}
                          {order.address && (
                            <div className="flex items-start gap-1.5 mt-0.5">
                              <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                                {order.address}
                              </p>
                            </div>
                          )}
                          {order.totalAmount > 0 && (
                            <p className="text-xs font-bold text-primary mt-1">
                              ₹{order.totalAmount}
                            </p>
                          )}
                          <Badge
                            variant="outline"
                            className="mt-1.5 text-xs bg-amber-50 text-amber-700 border-amber-200"
                          >
                            Awaiting confirmation
                          </Badge>
                        </div>
                      </div>

                      <PendingCountdownBadge orderId={order.id} />

                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleAccept(order)}
                          disabled={updateStatus.isPending}
                          className="flex-1 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                          data-ocid={`vendor.accept.button.${i + 1}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecline(order)}
                          className="flex-1 gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/5"
                          data-ocid={`vendor.decline.button.${i + 1}`}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Active Orders */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          Active Orders ({activeOrders.length})
        </h2>
        {activeOrders.length === 0 ? (
          <div
            className="text-center py-6 text-muted-foreground text-sm bg-muted/50 rounded-xl"
            data-ocid="vendor.active.empty_state"
          >
            No active orders right now.
          </div>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order, i) => {
              const sl = statusLabel[order.status] ?? {
                label: order.status,
                className: "bg-muted text-muted-foreground border-border",
              };
              return (
                <div
                  key={order.id}
                  className="bg-card border border-border rounded-xl p-4 shadow-sm"
                  data-ocid={`vendor.active.item.${i + 1}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {formatOrderItems(order)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #{order.id.slice(-8)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs flex-shrink-0 ${sl.className}`}
                    >
                      {sl.label}
                    </Badge>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3 space-y-1.5 mb-3">
                    {order.customerName && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold">
                          {order.customerName}
                        </span>
                      </div>
                    )}
                    {order.customerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="text-xs text-blue-600 underline underline-offset-1"
                        >
                          {order.customerPhone}
                        </a>
                      </div>
                    )}
                    {order.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                        <span className="text-xs break-words leading-snug">
                          {order.address}
                        </span>
                      </div>
                    )}
                    {order.totalAmount > 0 && (
                      <div className="flex items-center gap-2 border-t border-border pt-2">
                        <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-extrabold text-primary">
                          ₹{order.totalAmount}
                        </span>
                      </div>
                    )}
                  </div>
                  {order.status === OrderStatus.storeConfirmed && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkDelivered(order)}
                      disabled={updateStatus.isPending}
                      className="w-full gap-1.5 text-xs font-bold"
                      data-ocid={`vendor.deliver.button.${i + 1}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Delivered
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order History (collapsed) */}
      <div>
        <button
          type="button"
          onClick={() => setHistoryOpen((o) => !o)}
          className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
          data-ocid="vendor.history.toggle"
        >
          <Clock className="w-4 h-4" />
          Order History ({historyOrders.length})
          <ChevronDown
            className={`w-4 h-4 transition-transform ${historyOpen ? "rotate-180" : ""}`}
          />
        </button>
        <AnimatePresence>
          {historyOpen && historyOrders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2 overflow-hidden"
            >
              {historyOrders.slice(0, 20).map((order, i) => (
                <div
                  key={order.id}
                  className="bg-muted/30 border border-border rounded-xl p-3"
                  data-ocid={`vendor.history.item.${i + 1}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground truncate flex-1">
                      {formatOrderItems(order)}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] flex-shrink-0 ${
                        order.status === OrderStatus.delivered
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {order.status === OrderStatus.delivered
                        ? "Delivered"
                        : "Expired"}
                    </Badge>
                  </div>
                  {order.totalAmount > 0 && (
                    <p className="text-xs text-primary font-bold mt-0.5">
                      ₹{order.totalAmount}
                    </p>
                  )}
                </div>
              ))}
            </motion.div>
          )}
          {historyOpen && historyOrders.length === 0 && (
            <p className="text-sm text-muted-foreground py-3 text-center">
              No history yet.
            </p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function VendorDashboard() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const vendorId = currentUser?.id?.toString() || "anonymous";

  const [activeTab, setActiveTab] = useState<TabId>("orders");
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    message: string;
    action: (() => void) | null;
  }>({ open: false, message: "", action: null });
  const [showNewOrderPopup, setShowNewOrderPopup] = useState(false);
  const prevPendingCount = useRef(-1);

  // ── Multi-store: fetch all vendor stores ────────────────────────────
  const { data: stores = [], isLoading: storesLoading } = useStoresByVendor(
    vendorId === "anonymous" ? undefined : vendorId,
  );

  // selectedStoreId: persisted in localStorage
  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(SELECTED_STORE_KEY);
      return saved ?? "";
    } catch {
      return "";
    }
  });

  // When stores load, ensure selectedStoreId is valid; default to first
  useEffect(() => {
    if (stores.length === 0) return;
    const validId = stores.find((s) => s.id === selectedStoreId)?.id;
    if (!validId) {
      const firstId = stores[0].id;
      setSelectedStoreId(firstId);
      try {
        localStorage.setItem(SELECTED_STORE_KEY, firstId);
      } catch {}
    }
  }, [stores, selectedStoreId]);

  const handleSelectStore = useCallback((id: string) => {
    setSelectedStoreId(id);
    try {
      localStorage.setItem(SELECTED_STORE_KEY, id);
    } catch {}
  }, []);

  const selectedStore = stores.find((s) => s.id === selectedStoreId) ?? null;
  const toggleStore = useToggleStoreOpen();

  // Fetch orders for selected store (for pending badge)
  const { data: selectedStoreOrders = [] } = useOrdersByStore(
    selectedStoreId || undefined,
  );

  // Compute pending counts per store for badges
  // We only have deep data for the selected store; show count only there
  const pendingByStore = useMemo(() => {
    const map: Record<string, number> = {};
    const pending = selectedStoreOrders.filter(
      (o) => o.status === OrderStatus.requested,
    );
    if (selectedStoreId) map[selectedStoreId] = pending.length;
    return map;
  }, [selectedStoreOrders, selectedStoreId]);

  // New order notifications
  const pendingCount = pendingByStore[selectedStoreId] ?? 0;
  const orderSound = useRef(
    new Audio("https://www.soundjay.com/buttons/sounds/button-3.mp3"),
  );
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  useEffect(() => {
    const unlock = () => {
      orderSound.current
        .play()
        .then(() => {
          orderSound.current.pause();
          orderSound.current.currentTime = 0;
          setAudioUnlocked(true);
        })
        .catch(() => setAudioUnlocked(true));
    };
    document.addEventListener("click", unlock, { once: true });
    return () => document.removeEventListener("click", unlock);
  }, []);

  useEffect(() => {
    if (prevPendingCount.current === -1) {
      prevPendingCount.current = pendingCount;
      return;
    }
    if (pendingCount > prevPendingCount.current) {
      if (audioUnlocked) {
        orderSound.current.currentTime = 0;
        orderSound.current.play().catch(() => {});
      }
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setShowNewOrderPopup(true);
      setTimeout(() => setShowNewOrderPopup(false), 4000);
      addNotification({
        title: "Riva: New Order Received 🔥",
        message: `You have ${pendingCount} pending order${pendingCount > 1 ? "s" : ""}`,
        type: "order",
      });
    }
    prevPendingCount.current = pendingCount;
  }, [pendingCount, audioUnlocked, addNotification]);

  const handleOpenConfirm = (message: string, action: () => void) => {
    setConfirmModal({ open: true, message, action });
  };

  const handleConfirm = () => {
    confirmModal.action?.();
    setConfirmModal({ open: false, message: "", action: null });
  };

  const handleLogout = () => {
    localStorage.removeItem("riva_vendor_access");
    navigate({ to: "/" });
  };

  const handleToggleStore = async () => {
    if (!selectedStore) return;
    try {
      const isOpen = await toggleStore.mutateAsync(selectedStore.id);
      toast.success(isOpen ? "Store is now Open" : "Store is now Closed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle store.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        onConfirm={handleConfirm}
        onCancel={() =>
          setConfirmModal({ open: false, message: "", action: null })
        }
      />

      {/* New order popup */}
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
            <div className="bg-primary text-primary-foreground rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">New Order Received!</p>
                <p className="text-xs opacity-80">
                  Check incoming requests below
                </p>
              </div>
              <button
                onClick={() => setShowNewOrderPopup(false)}
                className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
                type="button"
                data-ocid="vendor.close_button"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Vendor Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentUser?.name || "Store Vendor"} · {stores.length} store
            {stores.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
            data-ocid="vendor.logout.button"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {storesLoading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading stores...
        </div>
      )}

      {/* No stores: CTA */}
      {!storesLoading && stores.length === 0 && (
        <Card
          className="mb-8 border-dashed border-2 border-primary/40 bg-primary/5"
          data-ocid="vendor.create_store.card"
        >
          <CardContent className="py-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-extrabold text-foreground">
                Create Your Store
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Set up your store to start selling to local customers
              </p>
            </div>
            <Button
              onClick={() => navigate({ to: "/vendor/create-store" })}
              className="font-bold px-8 rounded-xl"
              data-ocid="vendor.create_store.primary_button"
            >
              <Store className="w-4 h-4 mr-2" /> Create Store
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stores available */}
      {!storesLoading && stores.length > 0 && (
        <>
          {/* Store selector — only shown when vendor has multiple stores */}
          {stores.length > 1 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  Your Stores
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate({ to: "/vendor/create-store" })}
                  className="h-7 gap-1 text-xs"
                  data-ocid="vendor.add_store.button"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Store
                </Button>
              </div>
              <StoreSelector
                stores={stores}
                selectedId={selectedStoreId}
                onSelect={handleSelectStore}
                pendingByStore={pendingByStore}
              />
            </div>
          )}

          {/* Selected store header */}
          {selectedStore && (
            <Card
              className="mb-6 border-border bg-card"
              data-ocid="vendor.store.card"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {selectedStore.imageUrl ? (
                        <img
                          src={selectedStore.imageUrl}
                          alt={selectedStore.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <Store className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-foreground">
                        {selectedStore.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Array.isArray(selectedStore.categories) &&
                        selectedStore.categories.length > 0
                          ? selectedStore.categories.join(", ")
                          : "General"}{" "}
                        · {selectedStore.deliveryTime}
                      </p>
                      <Badge
                        className={`mt-1 text-[10px] ${
                          selectedStore.isOpen
                            ? "bg-primary text-primary-foreground border-0"
                            : "bg-muted text-muted-foreground border-0"
                        }`}
                      >
                        {selectedStore.isOpen ? "OPEN" : "CLOSED"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleToggleStore}
                      disabled={toggleStore.isPending}
                      className={`gap-1.5 text-xs font-bold ${
                        selectedStore.isOpen
                          ? "border-destructive/30 text-destructive hover:bg-destructive/5"
                          : "border-primary/30 text-primary hover:bg-primary/5"
                      }`}
                      data-ocid="vendor.store.toggle"
                    >
                      <Power className="w-3.5 h-3.5" />
                      {selectedStore.isOpen ? "Close Store" : "Open Store"}
                    </Button>
                    {stores.length === 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate({ to: "/vendor/create-store" })}
                        className="h-7 gap-1 text-xs text-muted-foreground"
                        data-ocid="vendor.add_store.button"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Store
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <div
            className="flex gap-1 bg-muted rounded-xl p-1 mb-6"
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
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-2 rounded-lg transition-all duration-200 relative ${
                  activeTab === id
                    ? "bg-card text-primary shadow-sm font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {icon}
                {label}
                {id === "orders" && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab: Products */}
          {activeTab === "products" && selectedStoreId && (
            <ManageProductsSection
              storeId={selectedStoreId}
              vendorId={vendorId}
              onConfirm={handleOpenConfirm}
            />
          )}

          {/* Tab: Analytics */}
          {activeTab === "analytics" && selectedStoreId && (
            <VendorAnalyticsDashboard storeId={selectedStoreId} />
          )}

          {/* Tab: Orders */}
          {activeTab === "orders" && selectedStoreId && (
            <OrdersTab
              storeId={selectedStoreId}
              onConfirm={handleOpenConfirm}
            />
          )}

          {/* Fallback if no store selected yet */}
          {activeTab === "orders" && !selectedStoreId && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Select a store above to view orders.
            </div>
          )}
        </>
      )}
    </div>
  );
}
