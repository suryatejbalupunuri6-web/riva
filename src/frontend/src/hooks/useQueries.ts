import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrderStatus, Store, UserProfile } from "../backend";
import { useActor } from "./useActor";

export function useCallerProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const query = useQuery<UserProfile | null>({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
    staleTime: 30_000,
  });
  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useMyOrders(customerId: string | undefined) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery({
    queryKey: ["myOrders", customerId],
    queryFn: async () => {
      if (!actor || !customerId) return [];
      const { Principal } = await import("@dfinity/principal");
      return actor.getOrdersByCustomer(Principal.fromText(customerId));
    },
    enabled: !!actor && !actorFetching && !!customerId,
    refetchInterval: 5_000,
  });
}

export function useOrdersByStatus(status: OrderStatus) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery({
    queryKey: ["ordersByStatus", status],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOrdersByStatus(status);
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 5_000,
  });
}

export function useAllOrders() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery({
    queryKey: ["allOrders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllOrders();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 10_000,
  });
}

export function useAllUsers() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useCreateOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      storeId: bigint;
      itemName: string;
      customerName: string;
      customerPhone: string;
      customerAddress: string;
      pinnedLatitude: number;
      pinnedLongitude: number;
      totalAmount?: number;
    }) => {
      if (!actor) throw new Error("Backend not connected. Please try again.");
      return actor.createOrder(
        params.storeId,
        params.itemName,
        params.customerName,
        params.customerPhone,
        params.customerAddress,
        params.pinnedLatitude,
        params.pinnedLongitude,
        params.totalAmount ?? 0,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myOrders"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersByStatus"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: bigint;
      status: OrderStatus;
    }) => {
      if (!actor) throw new Error("Backend not connected. Please try again.");
      return actor.updateOrderStatus(orderId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ordersByStatus"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["myOrders"] });
      // Refresh vendor analytics so delivered orders appear immediately
      queryClient.invalidateQueries({ queryKey: ["vendorAnalytics"] });
    },
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useAllProducts() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery({
    queryKey: ["allProducts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProducts();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 5_000,
  });
}

export function useVendorProducts(vendorId: string | undefined) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery({
    queryKey: ["vendorProducts", vendorId],
    queryFn: async () => {
      if (!actor || !vendorId) return [];
      const { Principal } = await import("@dfinity/principal");
      return actor.getProductsByVendor(Principal.fromText(vendorId));
    },
    enabled: !!actor && !actorFetching && !!vendorId,
    refetchInterval: 5_000,
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      storeId,
      name,
      description,
      price,
      image,
    }: {
      storeId: bigint;
      name: string;
      description: string;
      price: number;
      image: string;
    }) => {
      if (!actor) throw new Error("Backend not connected. Please try again.");
      return actor.addProduct(storeId, name, description, price, image);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allProducts"] });
      queryClient.invalidateQueries({ queryKey: ["vendorProducts"] });
      queryClient.invalidateQueries({ queryKey: ["storeProducts"] });
    },
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      productId,
      name,
      description,
      price,
      image,
    }: {
      productId: bigint;
      name: string;
      description: string;
      price: number;
      image: string;
    }) => {
      if (!actor) throw new Error("Backend not connected. Please try again.");
      return actor.updateProduct(productId, name, description, price, image);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allProducts"] });
      queryClient.invalidateQueries({ queryKey: ["vendorProducts"] });
      queryClient.invalidateQueries({ queryKey: ["storeProducts"] });
    },
  });
}

export function useDeleteProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: bigint) => {
      if (!actor) throw new Error("Backend not connected. Please try again.");
      return actor.deleteProduct(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allProducts"] });
      queryClient.invalidateQueries({ queryKey: ["vendorProducts"] });
      queryClient.invalidateQueries({ queryKey: ["storeProducts"] });
    },
  });
}

// ── Store Queries ──────────────────────────────────────────────────────────

export function useAllStores() {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Store[]>({
    queryKey: ["allStores"],
    queryFn: async () => {
      if (!actor) return [];
      const stores = await actor.getAllStores();
      console.log("[getAllStores] Fetched stores:", stores.length, stores);
      return stores;
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 10_000,
  });
}

export function useStoreByVendor(vendorId: string | undefined) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Store | null>({
    queryKey: ["storeByVendor", vendorId],
    queryFn: async () => {
      if (!actor || !vendorId) return null;
      const { Principal } = await import("@dfinity/principal");
      const store = await actor.getStoreByVendor(Principal.fromText(vendorId));
      console.log("[getStoreByVendor] vendorId:", vendorId, "result:", store);
      return store;
    },
    enabled: !!actor && !actorFetching && !!vendorId,
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 5_000,
  });
}

export function useStoreById(storeId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<Store | null>({
    queryKey: ["storeById", storeId?.toString()],
    queryFn: async () => {
      if (!actor || storeId === null) return null;
      return actor.getStoreById(storeId);
    },
    enabled: !!actor && !actorFetching && storeId !== null,
  });
}

export function useCreateStore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      image: string;
      category: string;
      description: string;
      deliveryTime: string;
      latitude: number;
      longitude: number;
    }) => {
      if (!actor) throw new Error("Backend not connected. Please try again.");
      console.log("[createStore] Calling backend with params:", params);
      const storeId = await actor.createStore(
        params.name,
        params.image,
        params.category,
        params.description,
        params.deliveryTime,
        params.latitude,
        params.longitude,
      );
      console.log("[createStore] Response storeId:", storeId);
      return storeId;
    },
    onSuccess: (storeId) => {
      console.log(
        "[createStore] Success, invalidating queries. storeId:",
        storeId,
      );
      queryClient.invalidateQueries({ queryKey: ["allStores"] });
      queryClient.invalidateQueries({ queryKey: ["storeByVendor"] });
    },
    onError: (error) => {
      console.error("[createStore] Error:", error);
    },
  });
}

export function useToggleStoreOpen() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (storeId: bigint) => {
      if (!actor) throw new Error("Backend not connected. Please try again.");
      return actor.toggleStoreOpen(storeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allStores"] });
      queryClient.invalidateQueries({ queryKey: ["storeByVendor"] });
      queryClient.invalidateQueries({ queryKey: ["storeById"] });
    },
  });
}

export function useUpdateStore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      storeId: bigint;
      name: string;
      image: string;
      category: string;
      description: string;
      deliveryTime: string;
    }) => {
      if (!actor) throw new Error("Backend not connected. Please try again.");
      return actor.updateStore(
        params.storeId,
        params.name,
        params.image,
        params.category,
        params.description,
        params.deliveryTime,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allStores"] });
      queryClient.invalidateQueries({ queryKey: ["storeByVendor"] });
      queryClient.invalidateQueries({ queryKey: ["storeById"] });
    },
  });
}

export function useUpdateStoreLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      storeId: bigint;
      latitude: number;
      longitude: number;
    }) => {
      if (!actor) throw new Error("Backend not connected. Please try again.");
      return actor.updateStoreLocation(
        params.storeId,
        params.latitude,
        params.longitude,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allStores"] });
      queryClient.invalidateQueries({ queryKey: ["storeByVendor"] });
      queryClient.invalidateQueries({ queryKey: ["storeById"] });
    },
  });
}

// setStoreDeliveryZone removed - using global delivery zone only

// ── Delivery Location Queries ──────────────────────────────────────────────

export interface DeliveryLocationResult {
  orderId: bigint;
  lat: number;
  lng: number;
  updatedAt: bigint;
}

export function useDeliveryLocation(orderId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();
  return useQuery<DeliveryLocationResult | null>({
    queryKey: ["deliveryLocation", orderId?.toString()],
    queryFn: async () => {
      if (!actor || orderId === null) return null;
      // Backend returns ?DeliveryLocation (Candid Option).
      // The JS/TS binding may decode this as:
      //   - null / undefined   → None
      //   - [DeliveryLocation] → Some  (array wrapper from Candid)
      //   - DeliveryLocation   → Some  (direct object, some bindings)
      // We handle all three variants so the hook is robust regardless of
      // which binding version the deployed canister uses.
      console.log("TRACKING orderId (customer poll):", orderId.toString());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (actor as any).getDeliveryLocation(orderId);
      // None case
      if (result === null || result === undefined) return null;
      // Candid array-wrapped Option: [] = None, [loc] = Some
      if (Array.isArray(result)) {
        if (result.length === 0) return null;
        const raw = result[0];
        return {
          orderId: BigInt(raw.orderId ?? orderId),
          lat: Number(raw.lat),
          lng: Number(raw.lng),
          updatedAt: BigInt(raw.updatedAt ?? 0n),
        };
      }
      // Direct object (Some without array wrapper)
      return {
        orderId: BigInt(result.orderId ?? orderId),
        lat: Number(result.lat),
        lng: Number(result.lng),
        updatedAt: BigInt(result.updatedAt ?? 0n),
      };
    },
    enabled: !!actor && !actorFetching && orderId !== null,
    refetchInterval: 3_000,
    staleTime: 0,
  });
}

// ── Admin Reset Queries ────────────────────────────────────────────────────

export function useResetAllData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (adminPassword: string) => {
      if (!actor) throw new Error("Backend not connected. Please try again.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).resetAllData(adminPassword) as Promise<string>;
    },
    onSuccess: () => {
      // Invalidate all queries so UI reflects fresh state
      queryClient.clear();
    },
  });
}
