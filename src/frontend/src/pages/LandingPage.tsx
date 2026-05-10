import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Clock,
  Leaf,
  MapPin,
  ShoppingBag,
  Star,
  Store,
  Truck,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const roles = [
  {
    icon: ShoppingBag,
    title: "Customer",
    desc: "Browse nearby stores, add items to cart, and get them delivered in minutes.",
    cta: "Order Now",
  },
  {
    icon: Store,
    title: "Store Vendor",
    desc: "List your products, accept orders from local customers, and grow your business.",
    cta: "Join as Vendor",
  },
  {
    icon: Truck,
    title: "Delivery Partner",
    desc: "Earn by picking up and delivering orders from nearby stores to customers.",
    cta: "Deliver Now",
  },
];

const steps = [
  {
    icon: ShoppingBag,
    step: "1",
    title: "Place an Order",
    desc: "Browse products from local stores and add them to your cart.",
  },
  {
    icon: Store,
    step: "2",
    title: "Vendor Confirms",
    desc: "A nearby vendor accepts your order within minutes.",
  },
  {
    icon: Truck,
    step: "3",
    title: "Fast Delivery",
    desc: "A delivery partner picks it up and brings it to your door.",
  },
];

const featureCards = [
  {
    icon: Zap,
    title: "Fast Delivery",
    desc: "Average 20-minute delivery to your doorstep.",
    color: "#fef3c7",
    iconColor: "#d97706",
  },
  {
    icon: Leaf,
    title: "Fresh Products",
    desc: "Sourced from trusted local vendors daily.",
    color: "#dcfce7",
    iconColor: "#16a34a",
  },
  {
    icon: Star,
    title: "Local Vendors",
    desc: "Verified stores within your neighborhood.",
    color: "#ede9fe",
    iconColor: "#7c3aed",
  },
];

const quickFeatures = [
  { icon: Clock, label: "Lightning Fast", desc: "Average 20-min delivery" },
  { icon: MapPin, label: "Hyperlocal", desc: "Stores within 2 km radius" },
  { icon: Star, label: "Trusted Partners", desc: "Verified stores & riders" },
];

export default function LandingPage() {
  const { login, identity, isLoggingIn } = useInternetIdentity();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (identity) {
      // Already logged in via Internet Identity — go directly to role selection / dashboard
      navigate({ to: "/role-setup" });
    } else {
      login();
    }
  };

  return (
    <div className="flex flex-col">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        <div
          className="relative flex items-center"
          style={{
            minHeight: "460px",
            backgroundImage:
              "url('/assets/generated/flashmart-hero.dim_1200x480.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundColor: "#052e16", // fallback dark green if image fails
          }}
        >
          {/* Dark overlay — solid, no blur, APK-safe */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.4) 100%)",
              zIndex: 1,
            }}
          />

          {/* Content above overlay */}
          <div
            className="relative w-full max-w-7xl mx-auto px-5 sm:px-8 py-16"
            style={{ zIndex: 2 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-xl"
            >
              {/* Brand badge */}
              <div
                className="inline-flex items-center gap-1.5 mb-4 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: "#16a34a" }}
              >
                <Zap
                  className="w-3.5 h-3.5 text-white"
                  style={{ fill: "white" }}
                />
                <span className="text-white text-xs font-bold tracking-wide">
                  Hyperlocal Delivery
                </span>
              </div>

              {/* Heading */}
              <h1
                className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-2"
                style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
              >
                Riva
              </h1>

              {/* Tagline */}
              <p
                className="text-white text-xl font-bold mb-3"
                style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
              >
                Why walk? Get it in minutes.
              </p>

              {/* Subtext */}
              <p
                className="text-white text-base mb-8"
                style={{
                  textShadow: "0 1px 4px rgba(0,0,0,0.7)",
                  opacity: 0.92,
                }}
              >
                Connecting you with local vendors and delivery partners —
                groceries, stationery, fruits, fashion, and more.
              </p>

              {/* Primary CTA — solid green, APK-safe */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleGetStarted}
                  disabled={isLoggingIn}
                  data-ocid="hero.primary_button"
                  style={{
                    backgroundColor: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "16px 32px",
                    fontSize: "16px",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: isLoggingIn ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(22,163,74,0.4)",
                    opacity: 1,
                    outline: "none",
                    minWidth: "160px",
                    justifyContent: "center",
                    touchAction: "manipulation",
                  }}
                >
                  {isLoggingIn ? "Connecting..." : "Start Ordering"}
                  {!isLoggingIn && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>

              {/* Vendor & Delivery links */}
              <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:gap-5">
                <button
                  type="button"
                  onClick={handleGetStarted}
                  data-ocid="hero.vendor.link"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    textDecoration: "underline",
                    opacity: 0.9,
                    padding: 0,
                    touchAction: "manipulation",
                    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                  }}
                >
                  Are you a vendor? Set up your store →
                </button>
                <button
                  type="button"
                  onClick={handleGetStarted}
                  data-ocid="hero.delivery.link"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    textDecoration: "underline",
                    opacity: 0.9,
                    padding: 0,
                    touchAction: "manipulation",
                    textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                  }}
                >
                  Delivery partner? Join our team →
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Quick Features Strip ── */}
      <section className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {quickFeatures.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "rgba(22,163,74,0.1)" }}
                >
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section className="py-12 px-5 sm:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Why choose Riva?
            </h2>
            <p className="text-muted-foreground text-sm">
              Designed for the modern Indian neighborhood.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {featureCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
              >
                <Card
                  className="h-full border-border"
                  style={{
                    background: "#ffffff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
                  }}
                >
                  <CardContent className="p-6">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: card.color }}
                    >
                      <card.icon
                        className="w-6 h-6"
                        style={{ color: card.iconColor }}
                      />
                    </div>
                    <h3 className="font-bold text-foreground mb-1">
                      {card.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{card.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role cards ── */}
      <section
        className="py-12 px-5 sm:px-8"
        style={{ backgroundColor: "#f9fafb" }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Who is Riva for?
            </h2>
            <p className="text-muted-foreground text-sm">
              Join as a customer, vendor, or delivery partner.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {roles.map((role, i) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
              >
                <Card
                  className="h-full border-border"
                  style={{
                    background: "#ffffff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: "rgba(22,163,74,0.1)" }}
                    >
                      <role.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-foreground">
                      {role.title}
                    </h3>
                    <p className="text-sm flex-1 mb-5 text-muted-foreground">
                      {role.desc}
                    </p>
                    <button
                      type="button"
                      onClick={handleGetStarted}
                      data-ocid={`role.${role.title.toLowerCase().replace(" ", "_")}.button`}
                      style={{
                        width: "100%",
                        padding: "10px 16px",
                        borderRadius: "8px",
                        border: "2px solid #16a34a",
                        backgroundColor: "transparent",
                        color: "#16a34a",
                        fontWeight: "700",
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        touchAction: "manipulation",
                      }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.backgroundColor = "#16a34a";
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "#fff";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.backgroundColor = "transparent";
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "#16a34a";
                      }}
                    >
                      {role.cta}
                    </button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-12 px-5 sm:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              How it works
            </h2>
            <p className="text-muted-foreground text-sm">
              Three simple steps to get what you need.
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 * i, duration: 0.5 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: "rgba(22,163,74,0.1)" }}
                  >
                    <s.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: "#16a34a" }}
                  >
                    {s.step}
                  </span>
                </div>
                <h3 className="font-bold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-12 px-5 text-center bg-card">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Join customers and vendors on Riva — fast, local, reliable.
          </p>
          <button
            type="button"
            onClick={handleGetStarted}
            disabled={isLoggingIn}
            data-ocid="landing.cta.primary_button"
            style={{
              backgroundColor: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "14px 32px",
              fontSize: "16px",
              fontWeight: "700",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: isLoggingIn ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(22,163,74,0.4)",
              opacity: 1,
              outline: "none",
              touchAction: "manipulation",
            }}
          >
            {isLoggingIn ? "Connecting..." : "Get Started Free"}
            {!isLoggingIn && <ArrowRight className="w-4 h-4" />}
          </button>
        </motion.div>
      </section>

      {/* ── Legal Footer ── */}
      <footer className="py-5 px-5 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Riva Labs. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <a
              href="mailto:riva5885@gmail.com"
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="footer.contact.link"
            >
              riva5885@gmail.com
            </a>
            <span className="text-border">·</span>
            <button
              type="button"
              onClick={() => navigate({ to: "/terms" })}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="footer.terms.link"
            >
              Terms &amp; Privacy
            </button>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">Powered by Riva Labs</span>
          </div>
          <p className="text-xs text-muted-foreground/50 mt-1">
            Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground transition-colors"
            >
              caffeine.ai
            </a>
          </p>
          <button
            type="button"
            onClick={() => navigate({ to: "/admin-reset" })}
            className="mt-1 text-xs text-muted-foreground/30 hover:text-muted-foreground transition-colors"
            data-ocid="landing.admin.link"
          >
            Admin
          </button>
        </div>
      </footer>
    </div>
  );
}
