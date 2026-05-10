import Time "mo:core/Time";
import List "mo:core/List";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Float "mo:core/Float";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";



actor {

  public type UserRole = {
    #customer;
    #store;
    #deliveryP;
    #admin;
  };

  // OrderItem represents a single cart line item stored in an order
  public type OrderItem = {
    productId : Text;
    name : Text;
    price : Float;
    quantity : Nat;
    imageUrl : Text;
  };

  public type Product = {
    id : Text;
    storeId : Text;
    name : Text;
    description : Text;
    price : Float;
    imageUrl : Text;
    vendorId : Principal;
    createdAt : Int;
    originalPrice : Float;
    sellingPrice : Float;
    category : Text;
  };

  module Product {
    public func compare(a : Product, b : Product) : Order.Order {
      Text.compare(a.id, b.id);
    };
  };

  public type Store = {
    id : Text;
    name : Text;
    imageUrl : Text;
    categories : [Text];
    description : Text;
    deliveryTime : Text;
    vendorId : Principal;
    isOpen : Bool;
    rating : Float;
    createdAt : Int;
    latitude : Float;
    longitude : Float;
  };

  public type UserProfile = {
    id : Principal;
    phone : Text;
    name : Text;
    role : UserRole;
    createdAt : Int;
  };

  public type OTP = {
    code : Text;
    expiresAt : Time.Time;
    verified : Bool;
  };

  public type OrderStatus = {
    #requested;
    #storeConfirmed;
    #riderAssigned;
    #pickedUp;
    #delivered;
    #expired;
  };

  public type Order = {
    id : Text;
    storeId : Text;
    items : [OrderItem];
    customerName : Text;
    customerPhone : Text;
    address : Text;
    pinnedLatitude : Float;
    pinnedLongitude : Float;
    customerId : Principal;
    status : OrderStatus;
    createdAt : Int;
    totalAmount : Float;
    deliveryFee : Float;
  };

  public type DeliveryLocation = {
    orderId : Text;
    lat : Float;
    lng : Float;
    updatedAt : Int;
    partnerId : Principal;
  };

  public type ResetLog = {
    timestamp : Int;
    caller : Principal;
  };

  module UserProfile {
    public func compare(p1 : UserProfile, p2 : UserProfile) : Order.Order {
      Text.compare(p1.phone, p2.phone);
    };
  };

  // Storage — keys are now Text IDs for Orders, Stores, Products
  let users = Map.empty<Principal, UserProfile>();
  let stores = Map.empty<Text, Store>();
  let products = Map.empty<Text, Product>();
  let otps = Map.empty<Text, OTP>();
  let orders = Map.empty<Text, Order>();
  let deliveryLocations = Map.empty<Text, DeliveryLocation>();
  var nextOrderId : Nat = 1;
  var nextProductId : Nat = 1;
  var nextStoreId : Nat = 1;
  var resetLogs : List.List<ResetLog> = List.empty();

  // ==========================================
  // EXPIRY CONSTANTS (nanoseconds)
  // ==========================================
  let FIVE_MINUTES_NS : Int = 5 * 60 * 1_000_000_000;
  let EIGHT_MINUTES_NS : Int = 8 * 60 * 1_000_000_000;

  // Lazily expire + delete orders older than threshold.
  // MUST only be called from shared (update) functions, never from queries.
  // Snapshots entries first to avoid mutating the map mid-iteration.
  func expireOrders() {
    let now = Time.now();
    // Snapshot all entries into an array before mutating
    let snapshot = orders.entries().toArray();
    let toExpire = List.empty<Text>();
    let toDelete = List.empty<Text>();
    for ((ordId, o) in snapshot.values()) {
      let age = now - o.createdAt;
      if (o.status == #requested and age > FIVE_MINUTES_NS) {
        toExpire.add(ordId);
      };
      if (o.status == #expired and age > EIGHT_MINUTES_NS) {
        toDelete.add(ordId);
      };
    };
    for (ordId in toExpire.values()) {
      switch (orders.get(ordId)) {
        case (?o) { orders.add(ordId, { o with status = #expired }) };
        case null {};
      };
    };
    for (ordId in toDelete.values()) {
      orders.remove(ordId);
    };
  };

  func isAppAdmin(principal : Principal) : Bool {
    switch (users.get(principal)) {
      case (null) { false };
      case (?profile) { profile.role == #admin };
    };
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    isAppAdmin(caller)
  };

  func isRegisteredUser(principal : Principal) : Bool {
    switch (users.get(principal)) {
      case (null) { false };
      case (?_) { true };
    };
  };

  // ==========================================
  // OTP — keep-alive safe: empty phone = no-op
  // ==========================================
  public shared ({ caller }) func generateOtp(phone : Text) : async Text {
    // Keep-alive ping: empty/sentinel phone returns dummy without storing anything
    if (phone == "" or phone == "0000000000") { return "000000" };
    let t = Int.abs(Time.now());
    let raw = (t + phone.size()) % 900000;
    let code = (100000 + raw).toText();
    let otp = {
      code;
      expiresAt = Time.now() + 300_000_000_000;
      verified = false;
    };
    otps.add(phone, otp);
    code;
  };

  public shared ({ caller }) func verifyOtp(phone : Text, code : Text) : async Bool {
    switch (otps.get(phone)) {
      case (null) { false };
      case (?otp) {
        if (code != otp.code) { false } else {
          if (Time.now() < otp.expiresAt) {
            let updatedOtp = { code = otp.code; expiresAt = otp.expiresAt; verified = true };
            otps.add(phone, updatedOtp);
            true;
          } else { false };
        };
      };
    };
  };

  // ==========================================
  // STORE MANAGEMENT
  // ==========================================

  public shared ({ caller }) func createStore(name : Text, imageUrl : Text, categories : [Text], description : Text, deliveryTime : Text, latitude : Float, longitude : Float) : async Text {
    if (not isRegisteredUser(caller)) {
      Runtime.trap("Unauthorized: Must be a registered user to create a store");
    };

    let sid = nextStoreId;
    nextStoreId += 1;
    let storeId = sid.toText();

    let store : Store = {
      id = storeId;
      name;
      imageUrl;
      categories;
      description;
      deliveryTime;
      vendorId = caller;
      isOpen = true;
      rating = 0.0;
      createdAt = Time.now();
      latitude;
      longitude;
    };

    stores.add(storeId, store);
    storeId;
  };

  public shared ({ caller }) func updateStore(storeId : Text, name : Text, imageUrl : Text, categories : [Text], description : Text, deliveryTime : Text) : async () {
    switch (stores.get(storeId)) {
      case (null) { Runtime.trap("Store not found") };
      case (?store) {
        if (store.vendorId != caller and not isAppAdmin(caller)) {
          Runtime.trap("Unauthorized: Can only update your own store");
        };
        stores.add(storeId, { store with name; imageUrl; categories; description; deliveryTime });
      };
    };
  };

  public shared ({ caller }) func updateStoreLocation(storeId : Text, latitude : Float, longitude : Float) : async () {
    if (not isAppAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can update store location");
    };
    switch (stores.get(storeId)) {
      case (null) { Runtime.trap("Store not found") };
      case (?store) {
        stores.add(storeId, { store with latitude; longitude });
      };
    };
  };

  public shared ({ caller }) func toggleStoreOpen(storeId : Text) : async Bool {
    switch (stores.get(storeId)) {
      case (null) { Runtime.trap("Store not found") };
      case (?store) {
        if (store.vendorId != caller and not isAppAdmin(caller)) {
          Runtime.trap("Unauthorized: Can only toggle your own store");
        };
        let updated = { store with isOpen = not store.isOpen };
        stores.add(storeId, updated);
        updated.isOpen;
      };
    };
  };

  public query ({ caller }) func getStoreByVendor(vendorId : Principal) : async ?Store {
    stores.values().find(func(store) { store.vendorId == vendorId });
  };

  public query ({ caller }) func getStoresByVendor(vendorId : Principal) : async [Store] {
    stores.values().filter(func(store) { store.vendorId == vendorId }).toArray();
  };

  public query ({ caller }) func getStoreById(storeId : Text) : async ?Store {
    stores.get(storeId);
  };

  public query ({ caller }) func getAllStores() : async [Store] {
    stores.values().toArray();
  };

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  // OTP verification requirement removed: Clerk handles phone verification on the frontend.
  // The backend now trusts the authenticated Internet Identity caller directly.
  public shared ({ caller }) func createUserProfile(phone : Text, name : Text, role : UserRole) : async () {
    let profile : UserProfile = { id = caller; phone; name; role = #customer; createdAt = Time.now() };
    users.add(caller, profile);
  };

  public shared ({ caller }) func updateUserRole(user : Principal, newRole : UserRole) : async () {
    if (not isAppAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can update user roles");
    };
    switch (users.get(user)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) {
        users.add(user, { profile with role = newRole });
      };
    };
  };

  public query ({ caller }) func isNewUser(phone : Text) : async Bool {
    for (user in users.values()) {
      if (user.phone == phone) { return false };
    };
    true;
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not isAppAdmin(caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    users.get(user);
  };

  public query ({ caller }) func getAllVendors() : async [UserProfile] {
    users.values().toArray().filter(func(p) { p.role == #store }).sort();
  };

  public query ({ caller }) func getAllCustomers() : async [UserProfile] {
    users.values().toArray().filter(func(p) { p.role == #customer }).sort();
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    users.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (profile.id != caller) {
      Runtime.trap("Unauthorized: Can only save your own profile");
    };
    users.add(caller, profile);
  };

  // ==========================================
  // ORDER MANAGEMENT
  // ==========================================

  public shared ({ caller }) func createOrder(storeId : Text, items : [OrderItem], customerName : Text, customerPhone : Text, address : Text, pinnedLatitude : Float, pinnedLongitude : Float, totalAmount : Float, deliveryFee : Float) : async Text {
    if (not isRegisteredUser(caller)) {
      Runtime.trap("Unauthorized: Must be a registered user to create orders");
    };
    // Lazily expire old orders on each new order creation
    expireOrders();
    let oid = nextOrderId;
    nextOrderId += 1;
    let orderId = oid.toText();
    let order : Order = {
      id = orderId;
      storeId;
      items;
      customerName;
      customerPhone;
      address;
      pinnedLatitude;
      pinnedLongitude;
      customerId = caller;
      status = #requested;
      createdAt = Time.now();
      totalAmount;
      deliveryFee;
    };
    orders.add(orderId, order);
    orderId;
  };

  public shared ({ caller }) func updateOrderStatus(orderId : Text, newStatus : OrderStatus) : async () {
    // Lazily expire old orders
    expireOrders();
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let isCustomer = order.customerId == caller;
        let isStoreOwner = switch (stores.get(order.storeId)) {
          case (null) { false };
          case (?store) { store.vendorId == caller };
        };
        let isRegisteredCaller = isRegisteredUser(caller);
        let isAdmin = isAppAdmin(caller);

        let authorized = switch (order.status, newStatus) {
          case (#requested, #storeConfirmed) { isStoreOwner or isAdmin };
          case (#storeConfirmed, #riderAssigned) { isRegisteredCaller or isAdmin };
          case (#riderAssigned, #pickedUp) { isRegisteredCaller or isAdmin };
          case (#pickedUp, #delivered) { isRegisteredCaller or isAdmin };
          case (_, #expired) { isAdmin or true }; // system/any can expire
          case (_, _) { isAdmin };
        };

        if (not authorized) {
          Runtime.trap("Unauthorized: Cannot update order status");
        };

        orders.add(orderId, { order with status = newStatus });
      };
    };
  };

  public query ({ caller }) func getOrderById(orderId : Text) : async ?Order {
    switch (orders.get(orderId)) {
      case (null) { null };
      case (?order) {
        let isCustomer = order.customerId == caller;
        let isStoreOwner = switch (stores.get(order.storeId)) {
          case (null) { false };
          case (?store) { store.vendorId == caller };
        };
        if (not isCustomer and not isStoreOwner and not isRegisteredUser(caller) and not isAppAdmin(caller)) {
          Runtime.trap("Unauthorized: Can only view orders you are involved in");
        };
        ?order;
      };
    };
  };

  public query ({ caller }) func getOrdersByCustomer(customer : Principal) : async [Order] {
    if (caller != customer and not isAppAdmin(caller)) {
      Runtime.trap("Unauthorized: Can only view your own orders");
    };
    orders.values().filter(func(o) { o.customerId == customer }).toArray();
  };

  public query ({ caller }) func getOrdersByStatus(status : OrderStatus) : async [Order] {
    if (not isRegisteredUser(caller) and not isAppAdmin(caller)) {
      Runtime.trap("Unauthorized: Must be a registered user to view orders");
    };
    orders.values().filter(func(o) { o.status == status }).toArray();
  };

  public query ({ caller }) func getAllOrders() : async [Order] {
    if (not isAppAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can view all orders");
    };
    orders.values().toArray();
  };

  public query ({ caller }) func getAllUsers() : async [UserProfile] {
    if (not isAppAdmin(caller)) {
      Runtime.trap("Unauthorized: Only admins can view all users");
    };
    users.values().toArray().sort();
  };

  public query ({ caller }) func getOrderStatus(orderId : Text) : async ?OrderStatus {
    switch (orders.get(orderId)) {
      case (null) { null };
      case (?order) {
        let isCustomer = order.customerId == caller;
        let isStoreOwner = switch (stores.get(order.storeId)) {
          case (null) { false };
          case (?store) { store.vendorId == caller };
        };
        if (not isCustomer and not isStoreOwner and not isRegisteredUser(caller) and not isAppAdmin(caller)) {
          Runtime.trap("Unauthorized: Can only check status of orders you are involved in");
        };
        ?order.status;
      };
    };
  };

  // ==========================================
  // PRODUCT MANAGEMENT
  // ==========================================

  public shared ({ caller }) func addProduct(storeId : Text, name : Text, description : Text, price : Float, imageUrl : Text, originalPrice : Float, sellingPrice : Float, category : Text) : async Text {
    switch (stores.get(storeId)) {
      case (null) { Runtime.trap("Store not found") };
      case (?store) {
        if (store.vendorId != caller and not isAppAdmin(caller)) {
          Runtime.trap("Unauthorized: Can only add products to your own store");
        };
      };
    };
    let pid = nextProductId;
    nextProductId += 1;
    let productId = pid.toText();
    let product : Product = {
      id = productId;
      storeId;
      name;
      description;
      price;
      imageUrl;
      vendorId = caller;
      createdAt = Time.now();
      originalPrice;
      sellingPrice;
      category;
    };
    products.add(productId, product);
    productId;
  };

  public shared ({ caller }) func updateProduct(productId : Text, name : Text, description : Text, price : Float, imageUrl : Text, originalPrice : Float, sellingPrice : Float, category : Text) : async () {
    switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) {
        if (product.vendorId != caller and not isAppAdmin(caller)) {
          Runtime.trap("Unauthorized: Can only update your own products");
        };
        products.add(productId, { product with name; description; price; imageUrl; originalPrice; sellingPrice; category });
      };
    };
  };

  public shared ({ caller }) func deleteProduct(productId : Text) : async () {
    switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) {
        if (product.vendorId != caller and not isAppAdmin(caller)) {
          Runtime.trap("Unauthorized: Can only delete your own products");
        };
        products.remove(productId);
      };
    };
  };

  public query ({ caller }) func getAllProducts() : async [Product] {
    products.values().toArray().sort();
  };

  public query ({ caller }) func getProductsByVendor(vendorId : Principal) : async [Product] {
    products.values().filter(func(p) { p.vendorId == vendorId }).toArray().sort();
  };

  public query func getProductsByStore(storeId : Text) : async [Product] {
    products.values().filter(func(p) { p.storeId == storeId }).toArray().sort();
  };

  public query func getProductsByCategory(category : Text) : async [Product] {
    products.values().filter(func(p) { p.category == category }).toArray().sort();
  };

  // ==========================================
  // LIVE DELIVERY LOCATION TRACKING
  // ==========================================

  public shared ({ caller }) func updateDeliveryLocation(orderId : Text, lat : Float, lng : Float) : async () {
    let loc : DeliveryLocation = {
      orderId;
      lat;
      lng;
      updatedAt = Time.now();
      partnerId = caller;
    };
    deliveryLocations.add(orderId, loc);
  };

  public query ({ caller }) func getDeliveryLocation(orderId : Text) : async ?DeliveryLocation {
    deliveryLocations.get(orderId);
  };

  public shared ({ caller }) func clearDeliveryLocation(orderId : Text) : async () {
    deliveryLocations.remove(orderId);
  };

  // ==========================================
  // VENDOR ANALYTICS
  // ==========================================

  public query func getOrdersByStore(storeId : Text) : async [Order] {
    orders.values().filter(func(o) { o.storeId == storeId }).toArray();
  };

  // Helper: convert nanosecond timestamp to YYYY-MM-DD text
  func timestampToDate(ns : Int) : Text {
    let secs = Int.abs(ns) / 1_000_000_000;
    var days = secs / 86400;
    var y : Nat = 1970;
    label yearLoop loop {
      let daysInYear : Nat = if (y % 400 == 0 or (y % 4 == 0 and y % 100 != 0)) 366 else 365;
      if (days < daysInYear) { break yearLoop };
      days -= daysInYear;
      y += 1;
    };
    let isLeap = y % 400 == 0 or (y % 4 == 0 and y % 100 != 0);
    let monthDays : [Nat] = if (isLeap)
      [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    else
      [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var m : Nat = 0;
    label monthLoop loop {
      if (m >= 12) { break monthLoop };
      let md = monthDays[m];
      if (days < md) { break monthLoop };
      days -= md;
      m += 1;
    };
    let month = m + 1;
    let day = days + 1;
    let yText = y.toText();
    let mText = if (month < 10) "0" # month.toText() else month.toText();
    let dText = if (day < 10) "0" # day.toText() else day.toText();
    yText # "-" # mText # "-" # dText;
  };

  func timestampToHour(ns : Int) : Nat {
    let secs = Int.abs(ns) / 1_000_000_000;
    (secs % 86400) / 3600;
  };

  func hourToLabel(h : Nat) : Text {
    let period : Text = if (h < 12) "AM" else "PM";
    let h12 : Nat = if (h == 0) 12 else if (h > 12) h - 12 else h;
    let h12End : Nat = if (h + 2 == 12) 12 else if (h + 2 > 12) h + 2 - 12 else h + 2;
    let endPeriod : Text = if (h + 2 < 12) "AM" else "PM";
    if (period == endPeriod) {
      h12.toText() # "-" # h12End.toText() # " " # period
    } else {
      h12.toText() # " " # period # "-" # h12End.toText() # " " # endPeriod
    };
  };

  // Summary analytics — delivered orders only; also returns pending count
  public query func getVendorAnalytics(storeId : Text, startDate : Int, endDate : Int) : async {
    totalEarnings : Float;
    totalOrders : Nat;
    todayOrders : Nat;
    pendingOrders : Nat;
    avgOrderValue : Float;
  } {
    let todayStart : Int = (Time.now() / 86_400_000_000_000) * 86_400_000_000_000;
    var totalEarnings : Float = 0.0;
    var totalOrders : Nat = 0;
    var todayOrders : Nat = 0;
    var pendingOrders : Nat = 0;
    for (o in orders.values()) {
      if (o.storeId == storeId) {
        // Count pending (requested or storeConfirmed)
        if (o.status == #requested or o.status == #storeConfirmed or o.status == #riderAssigned or o.status == #pickedUp) {
          pendingOrders += 1;
        };
        // Earnings from delivered only
        if (o.status == #delivered) {
          if (o.createdAt >= startDate and o.createdAt <= endDate) {
            totalEarnings += o.totalAmount;
            totalOrders += 1;
          };
          if (o.createdAt >= todayStart) {
            todayOrders += 1;
          };
        };
      };
    };
    let avgOrderValue = if (totalOrders == 0) 0.0 else totalEarnings / totalOrders.toFloat();
    { totalEarnings; totalOrders; todayOrders; pendingOrders; avgOrderValue };
  };

  public query func getVendorEarningsByDay(storeId : Text, startDate : Int, endDate : Int) : async [{
    date : Text;
    earnings : Float;
  }] {
    let earningsMap = Map.empty<Text, Float>();
    for (o in orders.values()) {
      if (o.storeId == storeId and o.status == #delivered and o.createdAt >= startDate and o.createdAt <= endDate) {
        let dateKey = timestampToDate(o.createdAt);
        let prev = switch (earningsMap.get(dateKey)) {
          case (?v) v;
          case null 0.0;
        };
        earningsMap.add(dateKey, prev + o.totalAmount);
      };
    };
    let result = List.empty<{ date : Text; earnings : Float }>();
    for ((date, earnings) in earningsMap.entries()) {
      result.add({ date; earnings });
    };
    result.toArray().sort(func(a, b) { Text.compare(a.date, b.date) });
  };

  public query func getVendorTopProduct(storeId : Text, startDate : Int, endDate : Int) : async {
    productName : Text;
    unitsSold : Nat;
  } {
    let countMap = Map.empty<Text, Nat>();
    for (o in orders.values()) {
      if (o.storeId == storeId and o.status == #delivered and o.createdAt >= startDate and o.createdAt <= endDate) {
        // Count each item in the order
        for (item in o.items.values()) {
          let prev = switch (countMap.get(item.name)) {
            case (?v) v;
            case null 0;
          };
          countMap.add(item.name, prev + item.quantity);
        };
      };
    };
    var topName : Text = "";
    var topCount : Nat = 0;
    for ((name, count) in countMap.entries()) {
      if (count > topCount) {
        topName := name;
        topCount := count;
      };
    };
    { productName = topName; unitsSold = topCount };
  };

  public query func getVendorPeakHour(storeId : Text, startDate : Int, endDate : Int) : async {
    hourLabel : Text;
    orderCount : Nat;
  } {
    let hourCountsVar : [var Nat] = Array.tabulate(24, func(_ : Nat) : Nat { 0 }).toVarArray();
    for (o in orders.values()) {
      if (o.storeId == storeId and o.status == #delivered and o.createdAt >= startDate and o.createdAt <= endDate) {
        let h = timestampToHour(o.createdAt);
        hourCountsVar[h] += 1;
      };
    };
    var peakHour : Nat = 0;
    var peakCount : Nat = 0;
    var i : Nat = 0;
    while (i < 24) {
      if (hourCountsVar[i] > peakCount) {
        peakCount := hourCountsVar[i];
        peakHour := i;
      };
      i += 1;
    };
    { hourLabel = hourToLabel(peakHour); orderCount = peakCount };
  };

  // ==========================================
  // ADMIN: RESET ALL DATA
  // ==========================================

  public shared ({ caller }) func resetAllData(adminPassword : Text, confirmation : Text) : async Text {
    if (adminPassword != "FLASHMART007") {
      return "Error: Invalid admin password";
    };
    if (confirmation != "RESET") {
      return "Error: Invalid confirmation. Type RESET to confirm";
    };

    orders.clear();
    deliveryLocations.clear();
    products.clear();
    stores.clear();
    users.clear();
    otps.clear();

    nextOrderId := 1;
    nextProductId := 1;
    nextStoreId := 1;

    let logEntry : ResetLog = {
      timestamp = Time.now();
      caller;
    };
    resetLogs.add(logEntry);

    "Reset successful";
  };

  public query func getResetLogs() : async [ResetLog] {
    resetLogs.toArray();
  };

};
