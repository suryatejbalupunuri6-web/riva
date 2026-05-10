import { useState } from "react";
import PasswordModal, { type DashboardRole } from "./PasswordModal";

// Updated keys to match Riva branding
const ACCESS_KEYS: Record<DashboardRole, string> = {
  vendor: "riva_vendor_access",
  delivery: "riva_delivery_access",
};

function isAccessValid(key: string): boolean {
  return localStorage.getItem(key) === "true";
}

interface ProtectedRouteProps {
  dashboardRole: DashboardRole;
  onCancel: () => void;
  children: React.ReactNode;
}

export default function ProtectedRoute({
  dashboardRole,
  onCancel,
  children,
}: ProtectedRouteProps) {
  const key = ACCESS_KEYS[dashboardRole];
  const [hasAccess, setHasAccess] = useState(() => isAccessValid(key));

  const handleSuccess = () => {
    localStorage.setItem(key, "true");
    setHasAccess(true);
  };

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <PasswordModal
      dashboardRole={dashboardRole}
      onSuccess={handleSuccess}
      onCancel={onCancel}
    />
  );
}
