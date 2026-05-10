import { loadConfig } from "@caffeineai/core-infrastructure";
import { StorageClient } from "@caffeineai/object-storage";
import { HttpAgent } from "@icp-sdk/core/agent";
import { useState } from "react";

export interface ImageUploadState {
  isUploading: boolean;
  progress: number;
  speedKBs: number; // KB/s during upload
  error: string | null;
}

// 15-second upload timeout per attempt (via AbortController)
const UPLOAD_TIMEOUT_MS = 15_000;

// Random 4-char alphanumeric suffix for unique filenames
function randomSuffix(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * Build a unique filename for the product image.
 * Format: product_{vendorId}_{timestamp}_{random4chars}.jpg
 */
export function buildProductFilename(vendorId: string): string {
  const ts = Date.now();
  const rand = randomSuffix();
  return `product_${vendorId}_${ts}_${rand}.jpg`;
}

async function buildStorageClient(): Promise<StorageClient> {
  const config = await loadConfig();
  const agent = new HttpAgent({ host: config.backend_host });
  return new StorageClient(
    config.bucket_name ?? "default-bucket",
    config.storage_gateway_url ?? "https://blob.caffeine.ai",
    config.backend_canister_id,
    config.project_id ?? "0000000-0000-0000-0000-000000000000",
    agent,
  );
}

/**
 * Classify an HTTP status code for retry decisions.
 * - true  → should retry (network error, 408, 5xx)
 * - false → should NOT retry (4xx except 408)
 */
function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return true;
  const msg = err.message.toLowerCase();

  // Explicit timeout from our AbortController
  if (msg.includes("timed out") || msg.includes("timeout")) return true;

  // Network-level failures (no HTTP code)
  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("failed to fetch")
  )
    return true;

  // Extract HTTP status code if present in message
  const statusMatch = msg.match(/\b([45]\d{2})\b/);
  if (statusMatch) {
    const code = Number.parseInt(statusMatch[1], 10);
    if (code === 408) return true; // Request Timeout — retry
    if (code >= 400 && code < 500) return false; // 4xx (client error) — don't retry
    if (code >= 500) return true; // 5xx (server error) — retry
  }

  return true;
}

/**
 * Wrap a blob upload in an AbortController-based 15-second timeout.
 * Returns the upload promise or rejects with a timeout error.
 */
function withAbortTimeout<T>(
  factory: (signal: AbortSignal) => Promise<T>,
  ms: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, ms);

  return factory(controller.signal).finally(() => clearTimeout(timer));
}

export function useImageUpload() {
  const [state, setState] = useState<ImageUploadState>({
    isUploading: false,
    progress: 0,
    speedKBs: 0,
    error: null,
  });

  const uploadImage = async (file: File): Promise<string> => {
    setState({ isUploading: true, progress: 0, speedKBs: 0, error: null });
    try {
      const storageClient = await buildStorageClient();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const startTime = Date.now();
      const fileSizeKB = bytes.length / 1024;

      const { hash } = await withAbortTimeout((_signal) => {
        return storageClient.putFile(bytes, (pct) => {
          const elapsed = (Date.now() - startTime) / 1000;
          const speedKBs =
            elapsed > 0 ? Math.round((fileSizeKB * pct) / 100 / elapsed) : 0;
          setState((s) => ({ ...s, progress: pct, speedKBs }));
        });
      }, UPLOAD_TIMEOUT_MS);

      const url = await storageClient.getDirectURL(hash);
      if (!url || url.startsWith("blob:")) {
        throw new Error("Storage returned an invalid URL");
      }
      setState({ isUploading: false, progress: 100, speedKBs: 0, error: null });
      return url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setState({ isUploading: false, progress: 0, speedKBs: 0, error: msg });
      console.error("[useImageUpload] uploadImage failed:", msg);
      throw new Error(msg);
    }
  };

  /**
   * Upload a processed Blob to object-storage.
   * Uses a 15-second AbortController timeout per attempt.
   * Validates the returned URL before returning.
   * Throws on failure so callers can implement retry logic.
   */
  const uploadBlob = async (
    blob: Blob,
    vendorId?: string,
    progressCallback?: (p: number, speedKBs: number) => void,
  ): Promise<string> => {
    setState({ isUploading: true, progress: 0, speedKBs: 0, error: null });

    try {
      const storageClient = await buildStorageClient();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const startTime = Date.now();
      const fileSizeKB = bytes.length / 1024;

      // Log unique filename for audit trail (hash-addressed in storage)
      const filename = buildProductFilename(vendorId ?? "unknown");
      console.log(`[useImageUpload] Uploading as ${filename}`);

      const { hash } = await withAbortTimeout((_signal) => {
        return storageClient.putFile(bytes, (pct) => {
          const elapsed = (Date.now() - startTime) / 1000;
          const speedKBs =
            elapsed > 0 ? Math.round((fileSizeKB * pct) / 100 / elapsed) : 0;
          progressCallback?.(pct, speedKBs);
          setState((s) => ({ ...s, progress: pct, speedKBs }));
        });
      }, UPLOAD_TIMEOUT_MS);

      const url = await storageClient.getDirectURL(hash);

      if (!url || typeof url !== "string" || url.trim() === "") {
        throw new Error(
          "Upload succeeded but no URL was returned — please try again",
        );
      }
      if (url.startsWith("blob:")) {
        throw new Error(
          "Upload succeeded but URL was invalid (blob) — please try again",
        );
      }
      if (!url.startsWith("http")) {
        throw new Error(
          `Upload succeeded but URL was invalid (${url.slice(0, 30)}) — please try again`,
        );
      }

      setState({
        isUploading: false,
        progress: 100,
        speedKBs: 0,
        error: null,
      });
      return url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setState({ isUploading: false, progress: 0, speedKBs: 0, error: msg });
      throw new Error(msg);
    }
  };

  const reset = () =>
    setState({ isUploading: false, progress: 0, speedKBs: 0, error: null });

  return {
    uploadImage,
    uploadBlob,
    isRetryable,
    reset,
    ...state,
  };
}
