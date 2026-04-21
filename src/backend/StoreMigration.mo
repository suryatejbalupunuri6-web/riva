import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // Reflects the on-chain shape before this migration:
  // includes accessControlState (from caffeineai-authorization mixin) plus stores
  type UserRole__old = { #admin; #guest; #user };

  type OldStore = {
    storeId : Int;
    name : Text;
    image : Text;
    category : Text;
    description : Text;
    deliveryTime : Text;
    vendorId : Principal;
    isOpen : Bool;
    rating : Float;
    createdAt : Int;
    latitude : Float;
    longitude : Float;
  };

  type NewStore = {
    storeId : Int;
    name : Text;
    image : Text;
    category : Text;
    description : Text;
    deliveryTime : Text;
    vendorId : Principal;
    isOpen : Bool;
    rating : Float;
    createdAt : Int;
    latitude : Float;
    longitude : Float;
  };

  public func migration(
    old : {
      accessControlState : {
        var adminAssigned : Bool;
        userRoles : Map.Map<Principal, UserRole__old>;
      };
      stores : Map.Map<Int, OldStore>;
    }
  ) : { stores : Map.Map<Int, NewStore> } {
    // Drop accessControlState, pass stores through unchanged
    { stores = old.stores };
  };
};
