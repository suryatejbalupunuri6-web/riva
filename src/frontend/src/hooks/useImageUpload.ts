import { loadConfig } from "@caffeineai/core-infrastructure";
import { StorageClient } from "@caffeineai/object-storage";
import { HttpAgent } from "@icp-sdk/core/agent";
import { useState } from "react";

export interface ImageUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export function useImageUpload() {
  const [state, setState] = useState<ImageUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const uploadImage = async (file: File): Promise<string> => {
    setState({ isUploading: true, progress: 0, error: null });
    try {
      const config = await loadConfig();
      const agent = new HttpAgent({ host: config.backend_host });
      const storageClient = new StorageClient(
        config.bucket_name ?? "default-bucket",
        config.storage_gateway_url ?? "https://blob.caffeine.ai",
        config.backend_canister_id,
        config.project_id ?? "0000000-0000-0000-0000-000000000000",
        agent,
      );

      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash } = await storageClient.putFile(bytes, (pct) => {
        setState((s) => ({ ...s, progress: pct }));
      });
      const url = await storageClient.getDirectURL(hash);
      setState({ isUploading: false, progress: 100, error: null });
      return url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setState({ isUploading: false, progress: 0, error: msg });
      throw new Error(msg);
    }
  };

  const reset = () =>
    setState({ isUploading: false, progress: 0, error: null });

  return { uploadImage, reset, ...state };
}
