import { useState } from "react";
import PasswordModal, { type DashboardRole } from "./PasswordModal";

const ACCESS_KEYS: Record<DashboardRole, string> = {
  vendor: "vendorAccess",
  delivery: "deliveryAccess",
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
