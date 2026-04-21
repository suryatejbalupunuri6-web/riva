import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { useRef } from "react";
import { useImageUpload } from "../hooks/useImageUpload";

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  onError?: (msg: string) => void;
}

export function ImageUploadField({
  value,
  onChange,
  onError,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, isUploading, progress } = useImageUpload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so the same file can be re-selected
    e.target.value = "";
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      onError?.(msg);
    }
  };

  const handleClear = () => {
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        data-ocid="products.upload_input"
      />

      {/* Preview or upload button */}
      {value && !isUploading ? (
        <div className="relative w-full">
          <img
            src={value}
            alt="Product preview"
            className="w-full h-24 object-cover rounded-xl border border-gray-200"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          {/* Clear button */}
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
            aria-label="Remove image"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ) : null}

      {/* Upload / Change button */}
      {isUploading ? (
        <div className="flex items-center gap-2 py-2 px-3 bg-green-50 border border-green-200 rounded-xl text-xs font-semibold text-green-700">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-green-600 flex-shrink-0" />
          <span>
            Uploading
            {progress > 0 && progress < 100 ? ` ${Math.round(progress)}%` : "…"}
          </span>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="w-full gap-1.5 text-xs font-semibold border-dashed border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-700 hover:bg-green-50"
          data-ocid="products.upload_button"
        >
          {value ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              Change Image
            </>
          ) : (
            <>
              <ImagePlus className="w-3.5 h-3.5" />
              Upload Image
            </>
          )}
        </Button>
      )}
    </div>
  );
}
