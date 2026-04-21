import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Clock,
  MapPin,
  ShoppingBag,
  Star,
  Store,
  Truck,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useApp } from "../context/AppContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const roles = [
  {
    icon: ShoppingBag,
    title: "Customer",
    desc: "Request any item from nearby stores and get it delivered in minutes.",
    cta: "Order Now",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Store,
    title: "Store Vendor",
    desc: "Accept orders from customers in your area and grow your local business.",
    cta: "Join as Vendor",
    color: "text-chart-2",
    bg: "bg-chart-2/10",
  },
  {
    icon: Truck,
    title: "Delivery Partner",
    desc: "Earn by picking up and delivering orders from nearby stores.",
    cta: "Deliver Now",
    color: "text-chart-3",
    bg: "bg-chart-3/10",
  },
];

const steps = [
  {
    icon: ShoppingBag,
    step: "1",
    title: "Place a Request",
    desc: "Tell us what you need — from groceries to hardware.",
  },
  {
    icon: Store,
    step: "2",
    title: "Store Accepts",
    desc: "A nearby vendor confirms your order within minutes.",
  },
  {
    icon: Truck,
    step: "3",
    title: "Fast Delivery",
    desc: "A delivery partner picks it up and brings it to you.",
  },
];

const features = [
  { icon: Clock, label: "Lightning Fast", desc: "Average 20-minute delivery" },
  { icon: MapPin, label: "Hyperlocal", desc: "Stores within 2 km radius" },
  { icon: Star, label: "Trusted Partners", desc: "Verified stores & riders" },
];

export default function LandingPage() {
  const { login, identity, isLoggingIn } = useInternetIdentity();
  const { navigate } = useApp();

  const handleGetStarted = () => {
    if (identity) {
      navigate("phone-login");
    } else {
      login();
    }
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="relative min-h-[380px] sm:min-h-[440px] flex items-center"
          style={{
            backgroundImage:
              "url('/assets/generated/flashmart-hero.dim_1200x480.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-foreground/65" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary rounded-md px-2 py-0.5 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-white fill-current" />
                  <span className="text-white text-xs font-semibold">
                    Hyperlocal Delivery
                  </span>
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
                Get anything from{" "}
                <span className="text-primary">nearby stores</span> delivered
                instantly.
              </h1>
              <p className="text-white/90 text-lg sm:text-xl font-semibold mb-2">
                Why walk? Get it in minutes.
              </p>
              <p className="text-white/85 text-base sm:text-lg mb-8">
                Riva connects you with local vendors and delivery partners —
                groceries, medicines, hardware, and more.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={handleGetStarted}
                  disabled={isLoggingIn}
                  className="bg-primary hover:bg-primary/90 text-white font-semibold gap-2"
                  data-ocid="hero.primary_button"
                >
                  {isLoggingIn ? "Connecting..." : "Start Ordering"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/60 text-white bg-transparent hover:bg-white/10 font-semibold"
                  onClick={() =>
                    document
                      .getElementById("how-it-works")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  data-ocid="hero.secondary_button"
                >
                  How it works
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{f.label}</p>
                  <p className="text-xs text-foreground/70">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Role cards */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Who is Riva for?
          </h2>
          <p className="text-foreground/70 font-medium">
            Join as a customer, vendor, or delivery partner.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i, duration: 0.5 }}
            >
              <Card className="shadow-card hover:shadow-card-hover transition-shadow h-full border-border">
                <CardContent className="p-6 flex flex-col h-full">
                  <div
                    className={`w-11 h-11 ${role.bg} rounded-xl flex items-center justify-center mb-4`}
                  >
                    <role.icon className={`w-5 h-5 ${role.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {role.title}
                  </h3>
                  <p className="text-sm text-foreground/75 flex-1 mb-5">
                    {role.desc}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGetStarted}
                    className="w-full border-2 border-border font-semibold hover:bg-primary hover:text-white hover:border-primary transition-colors"
                    data-ocid={`role.${role.title.toLowerCase().replace(" ", "_")}.button`}
                  >
                    {role.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="bg-muted py-14 px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              How it works
            </h2>
            <p className="text-foreground/70 font-medium">
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
                  <div className="w-14 h-14 bg-primary/15 rounded-2xl flex items-center justify-center">
                    <s.icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white rounded-full text-xs font-bold flex items-center justify-center">
                    {s.step}
                  </span>
                </div>
                <h3 className="font-bold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-foreground/75">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Ready to get started?
          </h2>
          <p className="text-foreground/70 font-medium mb-6">
            Join thousands of customers and vendors on Riva.
          </p>
          <Button
            size="lg"
            onClick={handleGetStarted}
            disabled={isLoggingIn}
            className="bg-primary hover:bg-primary/90 text-white font-semibold gap-2 px-8"
            data-ocid="landing.cta.primary_button"
          >
            {isLoggingIn ? "Connecting..." : "Get Started Free"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </section>

      {/* Subtle admin link */}
      <div className="pb-6 text-center">
        <button
          type="button"
          onClick={() => navigate("admin-reset")}
          className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors underline-offset-2 hover:underline"
          data-ocid="landing.admin.link"
        >
          Admin
        </button>
      </div>
    </div>
  );
}
