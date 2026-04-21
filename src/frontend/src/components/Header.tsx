import { Button } from "@/components/ui/button";
import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import NotificationBell from "./NotificationBell";

interface HeaderProps {
  onLogout: () => void;
}

export default function Header({ onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const { navigate, currentUser, screen } = useApp();
  const isAuthenticated = !!identity;

  const navLinks = [
    { label: "Home", screen: "landing" as const },
    { label: "Customer", screen: "customer-dashboard" as const },
    { label: "Vendor", screen: "vendor-dashboard" as const },
    { label: "Delivery", screen: "delivery-dashboard" as const },
  ];

  const handleNavClick = (target: (typeof navLinks)[number]["screen"]) => {
    if (target === "landing") {
      navigate("landing");
    } else if (isAuthenticated && currentUser) {
      navigate(target);
    } else {
      navigate("landing");
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <button
            type="button"
            onClick={() => navigate("landing")}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            data-ocid="header.link"
          >
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground fill-current" />
            </div>
            <span className="text-lg font-bold">
              <span className="text-foreground">Ri</span>
              <span className="text-primary">va</span>
            </span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                type="button"
                key={link.screen}
                onClick={() => handleNavClick(link.screen)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                  screen === link.screen
                    ? "text-primary bg-accent"
                    : "text-foreground/80 hover:text-foreground hover:bg-muted"
                }`}
                data-ocid={`nav.${link.label.toLowerCase()}.link`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA / Auth */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                {currentUser && (
                  <span className="hidden sm:block text-xs font-medium text-foreground/70">
                    {currentUser.name || currentUser.phone}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onLogout}
                  className="text-xs font-semibold border-2"
                  data-ocid="header.logout.button"
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={login}
                disabled={isLoggingIn}
                className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs"
                data-ocid="header.login.button"
              >
                {isLoggingIn ? "Connecting..." : "Get the App"}
              </Button>
            )}

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="md:hidden p-1 rounded-md hover:bg-muted"
              onClick={() => setMobileMenuOpen((v) => !v)}
              data-ocid="header.menu.toggle"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card px-4 py-2">
          {navLinks.map((link) => (
            <button
              type="button"
              key={link.screen}
              onClick={() => handleNavClick(link.screen)}
              className="block w-full text-left px-3 py-2 text-sm font-semibold text-foreground/80 hover:text-foreground hover:bg-muted rounded-md"
              data-ocid={`nav.mobile.${link.label.toLowerCase()}.link`}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
