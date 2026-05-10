import { useEffect, useRef, useState } from "react";

const VALID_EXTENSIONS = /\.(jpg|jpeg|png|webp)$/i;

function isValidImageUrl(url: string): boolean {
  if (!url.trim()) return false;
  try {
    const u = new URL(url.trim());
    return (
      (u.protocol === "http:" || u.protocol === "https:") &&
      VALID_EXTENSIONS.test(u.pathname)
    );
  } catch {
    return false;
  }
}

interface ImageUrlGeneratorProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  /** @deprecated — no longer used, kept for API compat */
  vendorId?: string;
}

export function ImageUrlGenerator({
  value,
  onChange,
  label = "Product Image",
}: ImageUrlGeneratorProps) {
  const [inputVal, setInputVal] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const prevValue = useRef(value);

  // Sync external value changes (e.g. autocomplete fill)
  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      setInputVal(value ?? "");
      setError(null);
      setImgError(false);
    }
  }, [value]);

  const validate = (url: string): boolean => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError(null);
      return false;
    }
    if (!isValidImageUrl(trimmed)) {
      setError(
        "Please enter a valid direct image URL ending in .jpg, .png, .jpeg, or .webp",
      );
      return false;
    }
    setError(null);
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    setImgError(false);
    // Clear error while typing so it doesn't flash
    if (error) setError(null);
    // Propagate value immediately so parent always has latest
    onChange(val.trim());
  };

  const handleBlur = () => {
    const trimmed = inputVal.trim();
    validate(trimmed);
  };

  const isValid = isValidImageUrl(inputVal.trim());
  const showPreview = isValid && !imgError;

  return (
    <div className="space-y-3">
      {/* Label */}
      <div>
        <p className="text-sm font-bold" style={{ color: "#111827" }}>
          {label}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
          Use a direct image link from trusted image hosting sites.
        </p>
      </div>

      {/* URL Input */}
      <div>
        <input
          type="url"
          value={inputVal}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="https://example.com/image.jpg"
          aria-label={label}
          aria-invalid={!!error}
          aria-describedby={error ? "img-url-error" : undefined}
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
          style={{
            borderColor: error ? "#dc2626" : isValid ? "#16a34a" : "#e5e7eb",
            backgroundColor: "#ffffff",
            minHeight: "48px",
            color: "#111827",
          }}
          data-ocid="image_url_gen.paste.input"
        />
        <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
          Accepted formats: .jpg, .jpeg, .png, .webp
        </p>
      </div>

      {/* Validation error */}
      {error && (
        <p
          id="img-url-error"
          className="text-xs font-semibold"
          style={{ color: "#dc2626" }}
          data-ocid="image_url_gen.error_state"
        >
          {error}
        </p>
      )}

      {/* Image preview */}
      {showPreview && (
        <div
          className="rounded-xl overflow-hidden border-2"
          style={{
            borderColor: "#86efac",
            backgroundColor: "#f0fdf4",
            width: "100%",
            maxWidth: "300px",
            aspectRatio: "1 / 1",
          }}
          data-ocid="image_url_gen.success_state"
        >
          <img
            src={inputVal.trim()}
            alt="Product preview"
            className="w-full h-full object-cover"
            onError={() => {
              setImgError(true);
              setError("Image could not be loaded. Please check the URL.");
            }}
          />
        </div>
      )}

      {/* Broken image error */}
      {imgError && (
        <p
          className="text-xs font-semibold"
          style={{ color: "#dc2626" }}
          data-ocid="image_url_gen.error_state"
        >
          Image could not be loaded. Please check the URL.
        </p>
      )}
    </div>
  );
}
