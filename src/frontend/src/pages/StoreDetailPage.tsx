import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Clock,
  Loader2,
  ShoppingBag,
  ShoppingCart,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { toast } from "sonner";
import type { Product } from "../backend";
import { useApp } from "../context/AppContext";
import { useCart } from "../context/CartContext";
import { useAllProducts, useStoreById } from "../hooks/useQueries";

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className="flex items-center gap-0.5 text-sm font-bold text-amber-500">
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      {rounded > 0 ? rounded.toFixed(1) : "New"}
    </span>
  );
}

function ProductCard({
  product,
  idx,
  onAdd,
  cartQty,
}: {
  product: Product;
  idx: number;
  onAdd: (product: Product) => void;
  cartQty: number;
}) {
  const imgSrc =
    product.image && product.image.trim() !== ""
      ? product.image
      : `https://picsum.photos/seed/${product.productId}/200/140`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * idx }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
      data-ocid={`store.products.item.${idx + 1}`}
    >
      <div className="relative">
        <img
          src={imgSrc}
          alt={product.name}
          className="w-full h-28 object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://picsum.photos/seed/${product.productId}/200/140`;
          }}
        />
        {cartQty > 0 && (
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center justify-center w-5 h-5 bg-green-600 text-white text-[10px] font-extrabold rounded-full shadow">
              {cartQty}
            </span>
          </div>
        )}
      </div>
      <div className="p-2.5 flex flex-col flex-1">
        <p className="font-bold text-sm text-gray-900 leading-tight truncate">
          {product.name}
        </p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-tight line-clamp-1">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-extrabold text-sm text-gray-900">
            ₹{product.price}
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => onAdd(product)}
          className="mt-2 w-full h-7 text-xs font-bold rounded-lg bg-green-500 hover:bg-green-600 text-white border-0"
          data-ocid={`store.products.item.${idx + 1}.button`}
        >
          {cartQty > 0 ? `Add More (${cartQty})` : "Add to Cart"}
        </Button>
      </div>
    </motion.div>
  );
}

export default function StoreDetailPage() {
  const { navigate, currentStoreId } = useApp();
  const { addItem, totalItems, items } = useCart();
  const { data: store, isLoading: storeLoading } = useStoreById(currentStoreId);
  const { data: allProducts = [], isLoading: productsLoading } =
    useAllProducts();

  const storeProducts = useMemo(() => {
    if (!currentStoreId) return [];
    return allProducts.filter((p) => p.storeId === currentStoreId);
  }, [allProducts, currentStoreId]);

  const handleAdd = (product: Product) => {
    if (!store) return;
    addItem(
      {
        id: product.productId.toString(),
        name: product.name,
        price: product.price,
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
        <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-semibold text-gray-600">Store not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("store-list")}
        >
          Browse Stores
        </Button>
      </div>
    );
  }

  const imgSrc =
    store.image && store.image.trim() !== ""
      ? store.image
      : `https://via.placeholder.com/800x300?text=${encodeURIComponent(store.name)}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back */}
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => navigate("store-list")}
          className="flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700"
          data-ocid="store.back.button"
        >
          <ArrowLeft className="w-4 h-4" />
          All Stores
        </button>
      </div>

      {/* Store Header */}
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
            <div className="flex items-center gap-3 mt-1">
              <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">
                {store.category}
              </Badge>
              <StarRating rating={store.rating} />
              <span className="flex items-center gap-1 text-xs text-white/90">
                <Clock className="w-3 h-3" />
                {store.deliveryTime}
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  store.isOpen
                    ? "bg-green-500 text-white"
                    : "bg-gray-400 text-white"
                }`}
              >
                {store.isOpen ? "OPEN" : "CLOSED"}
              </span>
            </div>
          </div>
        </div>
        {store.description && (
          <p className="text-sm text-gray-600 leading-relaxed">
            {store.description}
          </p>
        )}
      </div>

      {/* Products */}
      <div className="mb-6">
        <h2 className="text-base font-extrabold text-gray-900 mb-3">
          🛒 Products
        </h2>

        {productsLoading ? (
          <div
            className="flex items-center gap-2 text-gray-500 text-sm py-6"
            data-ocid="store.products.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin" /> Loading products...
          </div>
        ) : storeProducts.length === 0 ? (
          <div
            className="text-center py-12 text-gray-500 text-sm bg-gray-50 rounded-2xl"
            data-ocid="store.products.empty_state"
          >
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="font-semibold text-gray-600">No products yet</p>
            <p className="text-xs mt-1">
              This store hasn't added products yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {storeProducts.map((product, idx) => {
              const cartItem = items.find(
                (i) => i.id === product.productId.toString(),
              );
              return (
                <ProductCard
                  key={product.productId.toString()}
                  product={product}
                  idx={idx}
                  onAdd={handleAdd}
                  cartQty={cartItem?.quantity ?? 0}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Cart FAB */}
      {totalItems > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4"
        >
          <Button
            onClick={() => navigate("cart")}
            className="w-full h-12 text-base font-extrabold bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg"
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
