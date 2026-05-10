interface PriceDisplayProps {
  sellingPrice?: number | null;
  originalPrice?: number | null;
  /** Fallback if sellingPrice is null/undefined */
  price?: number | null;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { selling: "text-sm font-bold", original: "text-xs" },
  md: { selling: "text-base font-bold", original: "text-sm" },
  lg: { selling: "text-lg font-bold", original: "text-sm" },
};

export default function PriceDisplay({
  sellingPrice,
  originalPrice,
  price,
  size = "md",
}: PriceDisplayProps) {
  const classes = sizeMap[size];

  const effectiveSelling =
    sellingPrice != null && Number.isFinite(Number(sellingPrice))
      ? Number(sellingPrice)
      : price != null && Number.isFinite(Number(price))
        ? Number(price)
        : 0;

  const effectiveOriginal =
    originalPrice != null &&
    Number.isFinite(Number(originalPrice)) &&
    Number(originalPrice) > 0
      ? Number(originalPrice)
      : null;

  const hasDiscount =
    effectiveOriginal !== null &&
    effectiveOriginal > effectiveSelling &&
    effectiveSelling > 0;

  return (
    <div className="flex items-baseline gap-1.5 flex-wrap">
      <span className={`${classes.selling}`} style={{ color: "#16a34a" }}>
        ₹{effectiveSelling}
      </span>
      {hasDiscount && (
        <span
          className={`${classes.original} line-through`}
          style={{ color: "#9ca3af" }}
        >
          ₹{effectiveOriginal}
        </span>
      )}
    </div>
  );
}

export { PriceDisplay };
