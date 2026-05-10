import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Store {
    id: string;
    categories: Array<string>;
    latitude: number;
    name: string;
    createdAt: bigint;
    description: string;
    isOpen: boolean;
    deliveryTime: string;
    imageUrl: string;
    longitude: number;
    vendorId: Principal;
    rating: number;
}
export interface DeliveryLocation {
    lat: number;
    lng: number;
    orderId: string;
    partnerId: Principal;
    updatedAt: bigint;
}
export interface ResetLog {
    timestamp: bigint;
    caller: Principal;
}
export interface OrderItem {
    name: string;
    productId: string;
    imageUrl: string;
    quantity: bigint;
    price: number;
}
export interface Order {
    id: string;
    customerName: string;
    status: OrderStatus;
    deliveryFee: number;
    customerPhone: string;
    storeId: string;
    createdAt: bigint;
    pinnedLongitude: number;
    pinnedLatitude: number;
    totalAmount: number;
    address: string;
    customerId: Principal;
    items: Array<OrderItem>;
}
export interface Product {
    id: string;
    originalPrice: number;
    storeId: string;
    name: string;
    createdAt: bigint;
    sellingPrice: number;
    description: string;
    imageUrl: string;
    vendorId: Principal;
    category: string;
    price: number;
}
export interface UserProfile {
    id: Principal;
    name: string;
    createdAt: bigint;
    role: UserRole;
    phone: string;
}
export enum OrderStatus {
    riderAssigned = "riderAssigned",
    requested = "requested",
    expired = "expired",
    storeConfirmed = "storeConfirmed",
    pickedUp = "pickedUp",
    delivered = "delivered"
}
export enum UserRole {
    admin = "admin",
    customer = "customer",
    store = "store",
    deliveryP = "deliveryP"
}
export interface backendInterface {
    addProduct(storeId: string, name: string, description: string, price: number, imageUrl: string, originalPrice: number, sellingPrice: number, category: string): Promise<string>;
    clearDeliveryLocation(orderId: string): Promise<void>;
    createOrder(storeId: string, items: Array<OrderItem>, customerName: string, customerPhone: string, address: string, pinnedLatitude: number, pinnedLongitude: number, totalAmount: number, deliveryFee: number): Promise<string>;
    createStore(name: string, imageUrl: string, categories: Array<string>, description: string, deliveryTime: string, latitude: number, longitude: number): Promise<string>;
    createUserProfile(phone: string, name: string, role: UserRole): Promise<void>;
    deleteProduct(productId: string): Promise<void>;
    generateOtp(phone: string): Promise<string>;
    getAllCustomers(): Promise<Array<UserProfile>>;
    getAllOrders(): Promise<Array<Order>>;
    getAllProducts(): Promise<Array<Product>>;
    getAllStores(): Promise<Array<Store>>;
    getAllUsers(): Promise<Array<UserProfile>>;
    getAllVendors(): Promise<Array<UserProfile>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getDeliveryLocation(orderId: string): Promise<DeliveryLocation | null>;
    getOrderById(orderId: string): Promise<Order | null>;
    getOrderStatus(orderId: string): Promise<OrderStatus | null>;
    getOrdersByCustomer(customer: Principal): Promise<Array<Order>>;
    getOrdersByStatus(status: OrderStatus): Promise<Array<Order>>;
    getOrdersByStore(storeId: string): Promise<Array<Order>>;
    getProductsByCategory(category: string): Promise<Array<Product>>;
    getProductsByStore(storeId: string): Promise<Array<Product>>;
    getProductsByVendor(vendorId: Principal): Promise<Array<Product>>;
    getResetLogs(): Promise<Array<ResetLog>>;
    getStoreById(storeId: string): Promise<Store | null>;
    getStoreByVendor(vendorId: Principal): Promise<Store | null>;
    getStoresByVendor(vendorId: Principal): Promise<Array<Store>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVendorAnalytics(storeId: string, startDate: bigint, endDate: bigint): Promise<{
        totalOrders: bigint;
        pendingOrders: bigint;
        totalEarnings: number;
        avgOrderValue: number;
        todayOrders: bigint;
    }>;
    getVendorEarningsByDay(storeId: string, startDate: bigint, endDate: bigint): Promise<Array<{
        date: string;
        earnings: number;
    }>>;
    getVendorPeakHour(storeId: string, startDate: bigint, endDate: bigint): Promise<{
        hourLabel: string;
        orderCount: bigint;
    }>;
    getVendorTopProduct(storeId: string, startDate: bigint, endDate: bigint): Promise<{
        productName: string;
        unitsSold: bigint;
    }>;
    isCallerAdmin(): Promise<boolean>;
    isNewUser(phone: string): Promise<boolean>;
    resetAllData(adminPassword: string, confirmation: string): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    toggleStoreOpen(storeId: string): Promise<boolean>;
    updateDeliveryLocation(orderId: string, lat: number, lng: number): Promise<void>;
    updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<void>;
    updateProduct(productId: string, name: string, description: string, price: number, imageUrl: string, originalPrice: number, sellingPrice: number, category: string): Promise<void>;
    updateStore(storeId: string, name: string, imageUrl: string, categories: Array<string>, description: string, deliveryTime: string): Promise<void>;
    updateStoreLocation(storeId: string, latitude: number, longitude: number): Promise<void>;
    updateUserRole(user: Principal, newRole: UserRole): Promise<void>;
    verifyOtp(phone: string, code: string): Promise<boolean>;
}
