import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ChevronDown, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  acceptTerms,
  declineTerms,
  needsTermsAcceptance,
} from "../utils/termsStorage";

export default function TermsPage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [scrolledEnough, setScrolledEnough] = useState(false);
  const [showDeclineBlock, setShowDeclineBlock] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // If terms already accepted, go straight to the customer dashboard
  useEffect(() => {
    if (!needsTermsAcceptance()) {
      navigate({ to: "/customer" });
    }
  }, [navigate]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ratio = (el.scrollTop + el.clientHeight) / el.scrollHeight;
    if (ratio >= 0.8) setScrolledEnough(true);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const canAccept = checked && scrolledEnough;

  function handleAccept() {
    if (!canAccept || accepted) return;
    setAccepted(true);
    acceptTerms();
    navigate({ to: "/customer" });
  }

  function handleDecline() {
    declineTerms();
    setShowDeclineBlock(true);
  }

  return (
    <div
      className="fixed inset-0 flex flex-col z-50"
      style={{ backgroundColor: "#ffffff" }}
    >
      {/* Fixed Header */}
      <div
        className="flex-none border-b px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: "#ffffff",
          borderColor: "#e5e7eb",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#16a34a" }}
          >
            <ShieldCheck className="w-4 h-4" style={{ color: "#ffffff" }} />
          </div>
          <span className="text-xl font-bold" style={{ color: "#16a34a" }}>
            Riva
          </span>
        </div>
        <div className="h-5 w-px" style={{ backgroundColor: "#e5e7eb" }} />
        <span
          className="text-sm font-semibold leading-tight"
          style={{ color: "#1f2937" }}
        >
          Terms of Service &amp; Privacy Policy
        </span>
      </div>

      {/* Scroll hint banner */}
      {!scrolledEnough && (
        <div
          className="flex-none border-b px-4 py-2 flex items-center justify-center gap-2"
          style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a" }}
        >
          <ChevronDown
            className="w-4 h-4 animate-bounce"
            style={{ color: "#d97706" }}
          />
          <span className="text-xs font-medium" style={{ color: "#92400e" }}>
            Please scroll to read all terms before accepting
          </span>
          <ChevronDown
            className="w-4 h-4 animate-bounce"
            style={{ color: "#d97706" }}
          />
        </div>
      )}
      {scrolledEnough && (
        <div
          className="flex-none border-b px-4 py-2 flex items-center justify-center gap-2"
          style={{ backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }}
        >
          <CheckCircle2 className="w-4 h-4" style={{ color: "#16a34a" }} />
          <span className="text-xs font-medium" style={{ color: "#15803d" }}>
            You've read the terms — check the box below to continue
          </span>
        </div>
      )}

      {/* Scrollable Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-5 md:px-8"
        style={{ backgroundColor: "#ffffff", WebkitOverflowScrolling: "touch" }}
        data-ocid="terms.scroll_area"
      >
        <div className="max-w-2xl mx-auto pb-4">
          {/* Header Block */}
          <div
            className="mb-8 p-5 rounded-2xl border"
            style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}
          >
            <h1
              className="text-2xl font-bold mb-3"
              style={{ color: "#111827" }}
            >
              RIVA – TERMS OF SERVICE &amp; PRIVACY POLICY
            </h1>
            <div className="space-y-1 text-sm" style={{ color: "#4b5563" }}>
              <p>
                <span className="font-semibold" style={{ color: "#1f2937" }}>
                  Effective Date:
                </span>{" "}
                23/04/2026
              </p>
              <p>
                <span className="font-semibold" style={{ color: "#1f2937" }}>
                  App Name:
                </span>{" "}
                Riva
              </p>
              <p>
                <span className="font-semibold" style={{ color: "#1f2937" }}>
                  Contact Email:
                </span>{" "}
                <a
                  href="mailto:riva5885@gmail.com"
                  style={{ color: "#16a34a", textDecoration: "underline" }}
                >
                  riva5885@gmail.com
                </a>
              </p>
            </div>
          </div>

          <Section number="1" title="INTRODUCTION">
            <p>
              Welcome to Riva. Riva is a hyperlocal delivery platform that
              connects users with nearby local vendors for ordering products and
              facilitating delivery services. By accessing or using Riva, you
              agree to be bound by these Terms and our Privacy Policy. If you do
              not agree, please do not use the service.
            </p>
          </Section>

          <Section number="2" title="ELIGIBILITY">
            <BulletList
              items={[
                "Users must be at least 13 years old to use the app.",
                "If under 18, usage must be under parental/guardian supervision.",
                "By using Riva, you confirm that all information provided is accurate.",
              ]}
            />
          </Section>

          <Section number="3" title="SERVICES PROVIDED">
            <p className="mb-2">Riva acts as a platform that:</p>
            <BulletList
              items={[
                "Connects customers with local vendors",
                "Facilitates product browsing and ordering",
                "Enables delivery coordination",
              ]}
            />
            <p className="mt-2">
              Riva <strong>does not</strong> manufacture, store, or own
              inventory.
            </p>
          </Section>

          <Section number="4" title="USER ACCOUNTS">
            <p className="mb-2">Users must:</p>
            <BulletList
              items={[
                "Provide accurate details (name, phone, etc.)",
                "Keep login credentials secure",
                "Not misuse or share accounts",
              ]}
            />
            <p className="mt-2">
              Riva reserves the right to suspend accounts for misuse.
            </p>
          </Section>

          <Section number="5" title="ORDERS & PAYMENTS">
            <BulletList
              items={[
                "Orders placed are forwarded to vendors.",
                "Prices are set by vendors.",
                "Delivery fees may vary.",
              ]}
            />
            <p className="mt-2 mb-1">Riva is not responsible for:</p>
            <BulletList
              items={["Product quality issues", "Incorrect pricing by vendors"]}
            />
            <p className="mt-2 mb-1">Payments may include:</p>
            <BulletList
              items={["Cash on Delivery (COD)", "Online payment (if enabled)"]}
            />
          </Section>

          <Section number="6" title="DELIVERY TERMS">
            <BulletList
              items={[
                "Delivery times are estimates, not guarantees.",
                "Delays may occur due to traffic, weather, or vendor issues.",
                "Users must provide accurate delivery location.",
              ]}
            />
          </Section>

          <Section
            number="7"
            title="CANCELLATIONS & REFUNDS"
            subtitle="(Current version: No cancellation feature)"
          >
            <BulletList
              items={[
                "Once an order is placed, it cannot be canceled.",
                "Refunds (if any) depend on vendor discretion.",
              ]}
            />
          </Section>

          <Section number="8" title="USER CONDUCT">
            <p className="mb-2">Users agree NOT to:</p>
            <BulletList
              items={[
                "Use the app for illegal purposes",
                "Harass delivery partners or vendors",
                "Provide false information",
                "Attempt to hack or disrupt the app",
              ]}
            />
            <p className="mt-2">Violation may result in account termination.</p>
          </Section>

          <Section number="9" title="VENDOR TERMS">
            <p className="mb-2">Vendors are responsible for:</p>
            <BulletList
              items={[
                "Product accuracy",
                "Pricing correctness",
                "Order fulfillment",
              ]}
            />
            <p className="mt-2">Riva is only an intermediary platform.</p>
          </Section>

          <Section number="10" title="LIMITATION OF LIABILITY">
            <p className="mb-2">Riva is not liable for:</p>
            <BulletList
              items={[
                "Product defects",
                "Vendor delays",
                "Losses due to incorrect orders",
              ]}
            />
            <p className="mt-2">Use of the platform is at your own risk.</p>
          </Section>

          <Section number="11" title="INTELLECTUAL PROPERTY">
            <p className="mb-2">All content including:</p>
            <BulletList items={["App design", "Logo", "Branding"]} />
            <p className="mt-2">
              belongs to Riva and cannot be copied without permission.
            </p>
          </Section>

          <Section number="12" title="TERMINATION">
            <p className="mb-2">Riva may suspend or terminate accounts if:</p>
            <BulletList
              items={["Terms are violated", "Fraudulent activity is detected"]}
            />
          </Section>

          <Section number="13" title="CHANGES TO TERMS">
            <p>
              Riva may update these terms at any time. Continued use implies
              acceptance.
            </p>
          </Section>

          <Section number="14" title="GOVERNING LAW">
            <p>These Terms are governed by the laws of India.</p>
          </Section>

          <Section number="15" title="CONTACT">
            <p>For support or legal concerns:</p>
            <p className="mt-1">
              Email:{" "}
              <a
                href="mailto:riva5885@gmail.com"
                style={{ color: "#16a34a", textDecoration: "underline" }}
              >
                riva5885@gmail.com
              </a>
            </p>
          </Section>

          {/* Privacy Policy Divider */}
          <div className="my-8 flex items-center gap-3">
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: "#d1d5db" }}
            />
            <span
              className="text-sm font-bold px-3 py-1 rounded-full border"
              style={{
                backgroundColor: "#16a34a",
                borderColor: "#16a34a",
                color: "#ffffff",
              }}
            >
              PRIVACY POLICY
            </span>
            <div
              className="flex-1 h-px"
              style={{ backgroundColor: "#d1d5db" }}
            />
          </div>

          <Section number="16" title="DATA WE COLLECT">
            <p className="mb-2">We may collect:</p>
            <SubSection title="Personal Data:">
              <BulletList
                items={["Name", "Phone number", "Address/location"]}
              />
            </SubSection>
            <SubSection title="Usage Data:">
              <BulletList items={["App interactions", "Order history"]} />
            </SubSection>
            <SubSection title="Device Data:">
              <BulletList items={["Device type", "IP address"]} />
            </SubSection>
          </Section>

          <Section number="17" title="HOW WE USE DATA">
            <p className="mb-2">We use your data to:</p>
            <BulletList
              items={[
                "Process orders",
                "Improve app experience",
                "Provide customer support",
                "Enable delivery tracking",
              ]}
            />
          </Section>

          <Section number="18" title="LOCATION DATA">
            <BulletList
              items={[
                "Used for delivery and tracking",
                "Only accessed when necessary",
                "Not shared unnecessarily",
              ]}
            />
          </Section>

          <Section number="19" title="DATA SHARING">
            <p className="mb-2">We may share data with:</p>
            <BulletList
              items={["Vendors (for order fulfillment)", "Delivery partners"]}
            />
            <p className="mt-2 font-semibold" style={{ color: "#1f2937" }}>
              We do NOT sell user data.
            </p>
          </Section>

          <Section number="20" title="DATA SECURITY">
            <p>
              We implement reasonable measures to protect data, but no system is
              100% secure.
            </p>
          </Section>

          <Section number="21" title="DATA RETENTION">
            <p>
              Data is stored only as long as necessary for service operation.
            </p>
          </Section>

          <Section number="22" title="USER RIGHTS">
            <p className="mb-2">Users can:</p>
            <BulletList
              items={["Request data deletion", "Update personal details"]}
            />
            <p className="mt-2">Contact us for such requests.</p>
          </Section>

          <Section number="23" title="COOKIES / TRACKING">
            <p>We may use basic tracking tools to improve performance.</p>
          </Section>

          <Section number="24" title="CHILDREN'S PRIVACY">
            <p>We do not knowingly collect data from children under 13.</p>
          </Section>

          <Section number="25" title="THIRD-PARTY SERVICES">
            <p>
              We may use third-party tools (payments, analytics). Their policies
              apply.
            </p>
          </Section>

          <Section number="26" title="POLICY UPDATES">
            <p>Privacy Policy may be updated periodically.</p>
          </Section>

          {/* Final Note */}
          <div
            className="mt-8 p-5 rounded-2xl border-2"
            style={{ borderColor: "#bbf7d0", backgroundColor: "#f0fdf4" }}
          >
            <p
              className="text-sm font-semibold text-center"
              style={{ color: "#1f2937" }}
            >
              By using Riva, you agree to these Terms and Privacy Policy.
            </p>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Bar */}
      <div
        className="flex-none border-t px-4 py-4"
        style={{
          backgroundColor: "#ffffff",
          borderColor: "#e5e7eb",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
        }}
      >
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Checkbox */}
          <label
            className="flex items-start gap-3 cursor-pointer"
            style={{ minHeight: "44px" }}
            data-ocid="terms.checkbox"
          >
            <div
              className="relative mt-0.5 flex-none"
              style={{ width: "24px", height: "24px" }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  if (!scrolledEnough) return;
                  setChecked(e.target.checked);
                }}
                className="sr-only"
                aria-label="I have read and agree to the Terms of Service and Privacy Policy"
                disabled={!scrolledEnough}
              />
              <div
                className="w-6 h-6 rounded border-2 flex items-center justify-center"
                style={{
                  borderColor: !scrolledEnough
                    ? "#d1d5db"
                    : checked
                      ? "#16a34a"
                      : "#9ca3af",
                  backgroundColor: !scrolledEnough
                    ? "#f3f4f6"
                    : checked
                      ? "#16a34a"
                      : "#ffffff",
                  transition: "background-color 0.15s, border-color 0.15s",
                  cursor: scrolledEnough ? "pointer" : "not-allowed",
                }}
              >
                {checked && scrolledEnough && (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 12 12"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span
              className="text-sm leading-snug pt-0.5"
              style={{ color: "#374151" }}
            >
              I have read and agree to the{" "}
              <span className="font-semibold" style={{ color: "#111827" }}>
                Terms of Service and Privacy Policy
              </span>
            </span>
          </label>

          {/* Scroll hint if not scrolled enough */}
          {!scrolledEnough && checked && (
            <p className="text-xs text-center" style={{ color: "#d97706" }}>
              Please scroll through all the terms to enable acceptance.
            </p>
          )}

          <p className="text-xs text-center" style={{ color: "#6b7280" }}>
            Please accept the Terms to continue
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDecline}
              data-ocid="terms.decline_button"
              style={{
                flex: 1,
                minHeight: "48px",
                borderRadius: "12px",
                border: "2px solid #d1d5db",
                backgroundColor: "#ffffff",
                color: "#4b5563",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "border-color 0.15s, color 0.15s",
              }}
            >
              Decline
            </button>

            <button
              type="button"
              onClick={handleAccept}
              disabled={!canAccept || accepted}
              data-ocid="terms.accept_button"
              style={{
                flex: 2,
                minHeight: "48px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: canAccept && !accepted ? "#16a34a" : "#d1d5db",
                color: canAccept && !accepted ? "#ffffff" : "#9ca3af",
                fontSize: "14px",
                fontWeight: 700,
                cursor: canAccept && !accepted ? "pointer" : "not-allowed",
                boxShadow:
                  canAccept && !accepted
                    ? "0 2px 8px rgba(22,163,74,0.4)"
                    : "none",
                transition: "background-color 0.15s, box-shadow 0.15s",
                opacity: 1,
              }}
            >
              {accepted ? "Redirecting…" : "Accept & Continue"}
            </button>
          </div>
        </div>
      </div>

      {/* Decline Blocking Modal */}
      {showDeclineBlock && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          data-ocid="terms.decline_modal"
        >
          <div
            className="rounded-2xl p-8 max-w-sm w-full text-center"
            style={{
              backgroundColor: "#ffffff",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "#fee2e2" }}
            >
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#ef4444"
                strokeWidth={2}
                aria-label="Access denied"
                role="img"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "#111827" }}>
              Access Denied
            </h2>
            <p
              className="text-sm mb-4 leading-relaxed"
              style={{ color: "#4b5563" }}
            >
              You must accept the Terms of Service and Privacy Policy to use{" "}
              <strong>Riva</strong>. Without acceptance, access to the app is
              not permitted.
            </p>
            <div
              className="rounded-xl px-4 py-3 border"
              style={{ backgroundColor: "#f9fafb", borderColor: "#e5e7eb" }}
            >
              <p className="text-xs font-medium" style={{ color: "#6b7280" }}>
                Close this tab to exit the app.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper sub-components ──────────────────────────────────────────────────
function Section({
  number,
  title,
  subtitle,
  children,
}: {
  number: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h2
        className="text-base font-bold mb-2 flex items-center gap-2"
        style={{ color: "#111827" }}
      >
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-none"
          style={{ backgroundColor: "#16a34a", color: "#ffffff" }}
        >
          {number}
        </span>
        <span>
          {title}
          {subtitle && (
            <span
              className="ml-1 text-xs font-normal"
              style={{ color: "#6b7280" }}
            >
              {subtitle}
            </span>
          )}
        </span>
      </h2>
      <div
        className="pl-8 text-sm leading-relaxed space-y-1"
        style={{ color: "#374151" }}
      >
        {children}
      </div>
    </div>
  );
}

function SubSection({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="font-semibold text-sm mb-1" style={{ color: "#1f2937" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span
            className="mt-1.5 w-1.5 h-1.5 rounded-full flex-none"
            style={{ backgroundColor: "#16a34a" }}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
