import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  Clock,
  Loader2,
  ShoppingBag,
  ShoppingCart,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { toast } from "sonner";
import PriceDisplay from "../components/PriceDisplay";
import { useCart } from "../context/CartContext";
import {
  type FrontendProduct,
  useAllProducts,
  useStoreById,
} from "../hooks/useQueries";

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className="flex items-center gap-0.5 text-sm font-bold text-amber-500">
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      {rounded > 0 ? rounded.toFixed(1) : "New"}
    </span>
  );
}

function StoreClosedOverlay() {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center rounded-2xl px-2"
      style={{ background: "rgba(0,0,0,0.55)", pointerEvents: "none" }}
    >
      <p className="font-bold text-white text-xs leading-tight drop-shadow">
        Store Closed
      </p>
      <p className="text-white/80 text-[10px] mt-0.5 leading-tight">
        Not Available
      </p>
    </div>
  );
}

function ProductCard({
  product,
  idx,
  onAdd,
  cartQty,
  storeClosed,
}: {
  product: FrontendProduct;
  idx: number;
  onAdd: (product: FrontendProduct) => void;
  cartQty: number;
  storeClosed: boolean;
}) {
  const imgSrc =
    product.imageUrl && product.imageUrl.trim() !== ""
      ? product.imageUrl
      : `https://picsum.photos/seed/${product.id}/200/140`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * idx }}
      className={`rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col relative ${
        storeClosed ? "opacity-60" : "bg-card"
      }`}
      style={storeClosed ? { pointerEvents: "none" } : {}}
      data-ocid={`store.products.item.${idx + 1}`}
    >
      {storeClosed && <StoreClosedOverlay />}
      <div className="relative bg-card">
        <img
          src={imgSrc}
          alt={product.name}
          className="w-full h-28 object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://picsum.photos/seed/${product.id}/200/140`;
          }}
        />
        {cartQty > 0 && !storeClosed && (
          <div className="absolute top-2 right-2">
            <span
              className="inline-flex items-center justify-center w-5 h-5 text-white text-[10px] font-extrabold rounded-full shadow"
              style={{ backgroundColor: "#16a34a" }}
            >
              {cartQty}
            </span>
          </div>
        )}
      </div>
      <div className="p-2.5 flex flex-col flex-1 bg-card">
        <p className="font-bold text-sm text-foreground leading-tight truncate">
          {product.name}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight line-clamp-1">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <PriceDisplay
            sellingPrice={product.sellingPrice ?? product.price}
            originalPrice={product.originalPrice}
            size="sm"
          />
        </div>
        {product.category && (
          <Badge className="mt-0.5 text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border border-green-200 font-semibold w-fit">
            {product.category}
          </Badge>
        )}
        {storeClosed ? (
          <button
            type="button"
            className="mt-2 w-full h-7 text-xs font-bold rounded-lg bg-muted/60 border border-border flex items-center justify-center gap-1 text-muted-foreground cursor-default"
            data-ocid={`store.products.item.${idx + 1}.notify_button`}
            style={{ pointerEvents: "auto" }}
            onClick={(e) => e.stopPropagation()}
            aria-label="Notify me when store opens"
          >
            <Bell className="w-3 h-3" />
            Notify Me
          </button>
        ) : (
          <Button
            size="sm"
            onClick={() => onAdd(product)}
            className="mt-2 w-full h-7 text-xs font-bold rounded-lg text-white border-0"
            style={{ backgroundColor: "#16a34a" }}
            data-ocid={`store.products.item.${idx + 1}.button`}
          >
            {cartQty > 0 ? `Add More (${cartQty})` : "Add to Cart"}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default function StoreDetailPage() {
  const navigate = useNavigate();
  const { storeId: currentStoreId } = useParams({
    from: "/customer/store/$storeId",
  });
  const { addItem, totalItems, items } = useCart();
  const { data: store, isLoading: storeLoading } = useStoreById(currentStoreId);
  const { data: allProducts = [], isLoading: productsLoading } =
    useAllProducts();

  const storeProducts = useMemo(() => {
    if (!currentStoreId) return [];
    return allProducts.filter((p) => p.storeId === currentStoreId);
  }, [allProducts, currentStoreId]);

  const storeClosed = store ? !store.isOpen : false;

  const handleAdd = (product: FrontendProduct) => {
    if (!store || storeClosed) return;
    addItem(
      {
        id: product.id,
        name: product.name,
        price: product.sellingPrice ?? product.price,
      },
      product.storeId,
    );
    toast.success(`${product.name} added to cart!`);
  };

  if (storeLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="w-full h-48 rounded-2xl mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {["sk1", "sk2", "sk3", "sk4"].map((k) => (
            <div key={k} className="rounded-2xl overflow-hidden">
              <Skeleton className="w-full h-28" />
              <div className="p-2.5 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-7 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="font-semibold text-muted-foreground">Store not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate({ to: "/customer/stores" })}
        >
          Browse Stores
        </Button>
      </div>
    );
  }

  const imgSrc =
    store.imageUrl && store.imageUrl.trim() !== ""
      ? store.imageUrl
      : `https://via.placeholder.com/800x300?text=${encodeURIComponent(store.name)}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/customer/stores" })}
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80"
          data-ocid="store.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
          All Stores
        </button>
      </div>

      {storeClosed && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
          data-ocid="store.closed.banner"
        >
          <span className="text-xl flex-shrink-0">🚫</span>
          <div>
            <p className="text-sm font-bold text-red-800">
              This store is currently closed
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              We'll notify you when it opens. Items cannot be ordered right now.
            </p>
          </div>
        </motion.div>
      )}

      <div className="mb-6">
        <div className="relative rounded-2xl overflow-hidden mb-4">
          <img
            src={imgSrc}
            alt={store.name}
            className="w-full h-44 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                `https://via.placeholder.com/800x300?text=${encodeURIComponent(store.name)}`;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <h1 className="text-xl font-extrabold text-white">{store.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {store.categories?.[0] && (
                <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">
                  {store.categories[0]}
                </Badge>
              )}
              <StarRating rating={store.rating} />
              <span className="flex items-center gap-1 text-xs text-white/90">
                <Clock className="w-3 h-3" />
                {store.deliveryTime}
              </span>
              <span
                className="text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white"
                style={{
                  backgroundColor: store.isOpen ? "#16a34a" : "#ef4444",
                }}
              >
                {store.isOpen ? "OPEN" : "CLOSED"}
              </span>
            </div>
          </div>
        </div>
        {store.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {store.description}
          </p>
        )}
        {store.categories && store.categories.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {store.categories.map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className="text-xs font-medium"
              >
                {cat}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-base font-extrabold text-foreground mb-3 flex items-center gap-2">
          🛒 Products
          {storeClosed && (
            <Badge
              variant="outline"
              className="text-xs bg-red-50 text-red-700 border-red-200 ml-auto"
            >
              Store Closed
            </Badge>
          )}
        </h2>

        {productsLoading ? (
          <div
            className="flex items-center gap-2 text-muted-foreground text-sm py-6"
            data-ocid="store.products.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" /> Loading products...
          </div>
        ) : storeProducts.length === 0 ? (
          <div
            className="text-center py-12 text-muted-foreground text-sm bg-muted/30 rounded-2xl"
            data-ocid="store.products.empty_state"
          >
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="font-semibold text-muted-foreground">
              No products yet
            </p>
            <p className="text-xs mt-1">
              This store hasn't added products yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {storeProducts.map((product, idx) => {
              const cartItem = items.find((i) => i.id === product.id);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  idx={idx}
                  onAdd={handleAdd}
                  cartQty={cartItem?.quantity ?? 0}
                  storeClosed={storeClosed}
                />
              );
            })}
          </div>
        )}
      </div>

      {totalItems > 0 && !storeClosed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4"
        >
          <Button
            onClick={() => navigate({ to: "/customer/cart" })}
            className="w-full h-12 text-base font-extrabold text-white rounded-xl shadow-lg border-0"
            style={{ backgroundColor: "#16a34a" }}
            data-ocid="store.cart.button"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            View Cart ({totalItems} items)
          </Button>
        </motion.div>
      )}
    </div>
  );
}
