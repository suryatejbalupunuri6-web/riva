import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useImageUpload } from "../hooks/useImageUpload";
import {
  type ProcessedImage,
  processImage,
  validateFile,
} from "../utils/imageProcessor";

interface ImageUploadFieldProps {
  value?: string;
  onChange?: (url: string) => void;
  onImageUploaded?: (url: string) => void;
  onError?: (msg: string) => void;
  currentImageUrl?: string;
  label?: string;
  vendorId?: string;
  optional?: boolean;
}

type UIState =
  | "idle"
  | "processing"
  | "uploading"
  | "success"
  | "done"
  | "error";

const MAX_RETRIES = 3;
const SUCCESS_FLASH_MS = 1500;
const PLACEHOLDER_URL =
  "https://placehold.co/512x512/f0fdf4/16a34a?text=Product";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  const bases = [300, 700, 1500];
  const jitters = [200, 300, 500];
  const idx = Math.min(attempt - 1, bases.length - 1);
  return bases[idx] + Math.floor(Math.random() * jitters[idx]);
}

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return true;
  const msg = err.message.toLowerCase();
  if (msg.includes("timed out") || msg.includes("timeout")) return true;
  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("failed to fetch")
  )
    return true;
  const statusMatch = msg.match(/\b([45]\d{2})\b/);
  if (statusMatch) {
    const code = Number.parseInt(statusMatch[1], 10);
    if (code === 408) return true;
    if (code >= 400 && code < 500) return false;
    if (code >= 500) return true;
  }
  return true;
}

export function ImageUploadField({
  value,
  onChange,
  onImageUploaded,
  onError,
  currentImageUrl,
  label,
  vendorId,
  optional = false,
}: ImageUploadFieldProps) {
  const currentUrl = value ?? currentImageUrl ?? "";
  const handleUploaded = onImageUploaded ?? onChange ?? (() => {});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadBlob, progress } = useImageUpload();

  const [uiState, setUiState] = useState<UIState>(
    currentUrl && !currentUrl.startsWith("blob:") ? "done" : "idle",
  );
  const [processed, setProcessed] = useState<ProcessedImage | null>(null);
  const [persistedUrl, setPersistedUrl] = useState<string>(
    currentUrl && !currentUrl.startsWith("blob:") ? currentUrl : "",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attemptNum, setAttemptNum] = useState(0);
  const [hasFailedOnce, setHasFailedOnce] = useState(false);
  const uploadInProgressRef = useRef(false);

  useEffect(() => {
    return () => {
      if (processed?.previewUrl) URL.revokeObjectURL(processed.previewUrl);
    };
  }, [processed]);

  useEffect(() => {
    if (
      currentUrl &&
      !currentUrl.startsWith("blob:") &&
      currentUrl !== persistedUrl
    ) {
      setPersistedUrl(currentUrl);
      setUiState("done");
    }
  }, [currentUrl, persistedUrl]);

  const runUpload = useCallback(
    async (blob: Blob, originalSizeKB: number) => {
      uploadInProgressRef.current = true;
      setHasFailedOnce(false);
      let attempt = 0;

      while (attempt < MAX_RETRIES) {
        if (attempt > 0) {
          await delay(backoffMs(attempt));
        }
        setAttemptNum(attempt + 1);

        try {
          const url = await uploadBlob(blob, vendorId ?? "unknown");
          console.log(
            `[ImageUpload] Success | url=${url} | original=${originalSizeKB}KB`,
          );
          setPersistedUrl(url);
          setAttemptNum(0);
          uploadInProgressRef.current = false;
          handleUploaded(url);
          setUiState("success");
          setTimeout(() => setUiState("done"), SUCCESS_FLASH_MS);
          return;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Upload failed";
          console.error(
            `[ImageUpload] Attempt ${attempt + 1} failed | error=${errMsg}`,
          );
          setHasFailedOnce(true);

          if (!isRetryable(err)) {
            uploadInProgressRef.current = false;
            const msg = "Upload failed — tap Retry or use a placeholder image";
            setErrorMsg(msg);
            setAttemptNum(0);
            onError?.(msg);
            setUiState("error");
            return;
          }
          attempt++;
        }
      }

      uploadInProgressRef.current = false;
      const msg =
        "Upload failed after 3 attempts — tap Retry or use a placeholder";
      setErrorMsg(msg);
      setAttemptNum(0);
      onError?.(msg);
      setUiState("error");
    },
    [uploadBlob, vendorId, handleUploaded, onError],
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    e.target.value = "";

    const validation = validateFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error ?? "Invalid file");
      setHasFailedOnce(true);
      setUiState("error");
      return;
    }

    setErrorMsg(null);
    setAttemptNum(0);
    setHasFailedOnce(false);
    setUiState("processing");

    const originalSizeKB = Math.round(file.size / 1024);
    try {
      const result = await processImage(file);
      setProcessed(result);
      setUiState("uploading");
      void runUpload(result.blob, originalSizeKB);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to process image";
      setErrorMsg(msg);
      setHasFailedOnce(true);
      setUiState("error");
    }
  };

  const handleRetry = async () => {
    if (!processed?.blob) {
      setErrorMsg(null);
      setHasFailedOnce(false);
      setUiState("idle");
      setTimeout(() => fileInputRef.current?.click(), 50);
      return;
    }
    setErrorMsg(null);
    setUiState("uploading");
    void runUpload(processed.blob, processed.sizeKB);
  };

  const handleUsePlaceholder = () => {
    if (processed?.previewUrl) URL.revokeObjectURL(processed.previewUrl);
    setProcessed(null);
    setErrorMsg(null);
    setHasFailedOnce(false);
    setAttemptNum(0);
    uploadInProgressRef.current = false;
    setPersistedUrl(PLACEHOLDER_URL);
    handleUploaded(PLACEHOLDER_URL);
    setUiState("done");
  };

  const handleChange = () => {
    if (processed?.previewUrl) URL.revokeObjectURL(processed.previewUrl);
    setProcessed(null);
    setErrorMsg(null);
    setHasFailedOnce(false);
    setAttemptNum(0);
    uploadInProgressRef.current = false;
    setUiState("idle");
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const handleClear = () => {
    if (processed?.previewUrl) URL.revokeObjectURL(processed.previewUrl);
    setProcessed(null);
    setPersistedUrl("");
    setErrorMsg(null);
    setHasFailedOnce(false);
    setAttemptNum(0);
    uploadInProgressRef.current = false;
    setUiState("idle");
    handleUploaded("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isPlaceholder = persistedUrl === PLACEHOLDER_URL;

  const uploadLabel =
    attemptNum > 1
      ? `Retrying (${attemptNum}/${MAX_RETRIES})…`
      : progress > 0 && progress < 100
        ? `Uploading… ${Math.round(progress)}%`
        : "Uploading…";

  const showSkip = optional || hasFailedOnce;

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        style={{ display: "none" }}
        onChange={handleFileChange}
        data-ocid="image_upload.input"
      />

      {/* IDLE */}
      {uiState === "idle" && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
          style={{
            minHeight: "88px",
            paddingTop: "20px",
            paddingBottom: "20px",
          }}
          data-ocid="image_upload.upload_button"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#f0fdf4" }}
          >
            <ImagePlus className="w-5 h-5" style={{ color: "#16a34a" }} />
          </div>
          <span className="text-sm font-bold text-foreground">Add Image</span>
          <span className="text-xs text-muted-foreground">
            JPG · PNG · WEBP · any size
          </span>
        </button>
      )}

      {/* PROCESSING */}
      {uiState === "processing" && (
        <div
          className="w-full flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/30"
          style={{ minHeight: "88px" }}
          data-ocid="image_upload.loading_state"
        >
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: "#16a34a" }}
          />
          <span className="text-sm font-semibold text-muted-foreground">
            Preparing image…
          </span>
        </div>
      )}

      {/* UPLOADING */}
      {uiState === "uploading" && processed && (
        <div className="space-y-3" data-ocid="image_upload.loading_state">
          {/* Preview thumbnail */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
            <img
              src={processed.previewUrl}
              alt="Preview of selected file"
              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Loader2
                  className="w-4 h-4 animate-spin flex-shrink-0"
                  style={{ color: "#16a34a" }}
                />
                <span className="text-sm font-semibold text-foreground truncate">
                  {uploadLabel}
                </span>
              </div>
              {/* Green progress bar */}
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: attemptNum > 1 ? "30%" : `${Math.max(8, progress)}%`,
                    backgroundColor: "#16a34a",
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  {processed.sizeKB} KB · {processed.format}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {attemptNum > 1
                    ? `Attempt ${attemptNum}/${MAX_RETRIES}`
                    : `${Math.round(progress)}%`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS FLASH */}
      {uiState === "success" && (
        <div
          className="w-full flex items-center gap-3 rounded-xl border-2 p-4"
          style={{ borderColor: "#16a34a", backgroundColor: "#f0fdf4" }}
          data-ocid="image_upload.success_state"
        >
          {processed?.previewUrl && (
            <div className="relative flex-shrink-0">
              <img
                src={processed.previewUrl}
                alt="Uploaded"
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div
                className="absolute -bottom-1 -right-1 rounded-full p-0.5"
                style={{ backgroundColor: "#16a34a" }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          )}
          <div>
            <p className="text-sm font-bold" style={{ color: "#15803d" }}>
              Image ready! ✓
            </p>
            <p className="text-xs" style={{ color: "#16a34a" }}>
              Photo uploaded successfully
            </p>
          </div>
        </div>
      )}

      {/* DONE */}
      {uiState === "done" && persistedUrl && (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img
              src={persistedUrl}
              alt="Product thumbnail"
              className="w-full h-28 object-cover"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.src = PLACEHOLDER_URL;
              }}
            />
            {/* Badges */}
            <div
              className="absolute top-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "#16a34a" }}
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              {isPlaceholder ? "Placeholder" : "Saved"}
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
              aria-label="Remove image"
              data-ocid="image_upload.clear_button"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleChange}
            className="w-full text-sm font-semibold gap-2 border-dashed"
            style={{ minHeight: "44px" }}
            data-ocid="image_upload.change_button"
          >
            <RefreshCw className="w-4 h-4" />
            Change Image
          </Button>
        </div>
      )}

      {/* ERROR */}
      {uiState === "error" && (
        <div className="space-y-2" data-ocid="image_upload.error_state">
          {/* Error message */}
          <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 rounded-xl px-3 py-3">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive font-medium leading-snug">
              {errorMsg ?? "Upload failed — tap Retry to try again"}
            </p>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleRetry}
              className="text-sm font-bold gap-1.5 text-white"
              style={{ minHeight: "44px", backgroundColor: "#16a34a" }}
              data-ocid="image_upload.retry_button"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUsePlaceholder}
              className="text-sm font-semibold gap-1.5"
              style={{ minHeight: "44px" }}
              data-ocid="image_upload.placeholder_button"
            >
              <ImagePlus className="w-4 h-4" />
              Use Placeholder
            </Button>
          </div>

          {/* Choose different image */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleChange}
            className="w-full text-sm text-muted-foreground gap-1.5"
            style={{ minHeight: "44px" }}
            data-ocid="image_upload.change_button"
          >
            Choose a Different Image
          </Button>

          {/* Skip — only shown if optional or after failure */}
          {showSkip && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setUiState("idle");
                setErrorMsg(null);
                setHasFailedOnce(false);
                handleUploaded("");
              }}
              className="w-full text-xs text-muted-foreground/60"
              style={{ minHeight: "44px" }}
              data-ocid="image_upload.skip_button"
            >
              Skip image — continue without photo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
