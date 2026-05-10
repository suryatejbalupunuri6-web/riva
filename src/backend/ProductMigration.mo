import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // Old Product type (before originalPrice/sellingPrice were added)
  type OldProduct = {
    productId : Int;
    storeId : Int;
    name : Text;
    description : Text;
    price : Float;
    image : Text;
    vendorId : Principal;
    createdAt : Int;
  };

  // New Product type (with optional discount price fields)
  type NewProduct = {
    productId : Int;
    storeId : Int;
    name : Text;
    description : Text;
    price : Float;
    image : Text;
    vendorId : Principal;
    createdAt : Int;
    originalPrice : ?Float;
    sellingPrice : ?Float;
  };

  public func migrateProducts(
    old : Map.Map<Int, OldProduct>
  ) : Map.Map<Int, NewProduct> {
    let newMap = Map.empty<Int, NewProduct>();
    for ((k, p) in old.entries()) {
      newMap.add(k, {
        productId = p.productId;
        storeId = p.storeId;
        name = p.name;
        description = p.description;
        price = p.price;
        image = p.image;
        vendorId = p.vendorId;
        createdAt = p.createdAt;
        originalPrice = null;
        sellingPrice = null;
      });
    };
    newMap;
  };
};
