"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { IconPackage, IconTag, IconHandshake, IconStar } from "@/components/icons";

export default function LoginModal() {
  const { showLoginModal, closeLoginModal, loginWithPhone, pendingAction, clearPendingAction } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (showLoginModal) {
      setPhone("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [showLoginModal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    try {
      const user = await loginWithPhone(cleaned);
      if (!user) {
        setError("Something went wrong. Please try again.");
        return;
      }

      // If profile is incomplete, redirect to setup
      if (!user.is_profile_complete) {
        router.push("/account/setup");
      } else if (pendingAction?.returnUrl) {
        // Resume action
        clearPendingAction();
      }
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!showLoginModal) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={closeLoginModal}
      />

      {/* Bottom Sheet Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-[61] animate-slide-up">
        <div className="mx-auto max-w-lg">
          <div className="rounded-t-3xl bg-card-bg border-t border-x border-card-border shadow-2xl shadow-black/20">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-card-border" />
            </div>

            <div className="px-6 pb-8 pt-2">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-foreground">Continue to Order</h2>
                <p className="text-sm text-muted mt-1">Login to save cart, manage orders & checkout securely</p>
              </div>

              {/* Phone Input */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-phone" className="block text-sm font-semibold text-foreground mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">+91</span>
                    <input
                      ref={inputRef}
                      id="login-phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, ""));
                        setError("");
                      }}
                      placeholder="Enter 10 digit number"
                      className="w-full rounded-xl border border-card-border bg-background pl-14 pr-4 py-3.5 text-base text-foreground placeholder:text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  {error && (
                    <p className="mt-2 text-xs text-red-500 font-medium flex items-center gap-1">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                      </svg>
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || phone.length < 10}
                  className="w-full rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg disabled:opacity-50 hover:shadow-xl active:scale-[0.98] transition-all duration-200"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    "Continue"
                  )}
                </button>
              </form>

              {/* Benefits */}
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {[
                  { icon: IconStar, text: "Faster checkout" },
                  { icon: IconPackage, text: "Order tracking" },
                  { icon: IconHandshake, text: "Saved addresses" },
                  { icon: IconTag, text: "GST billing" },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
                    <b.icon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-muted">{b.text}</span>
                  </div>
                ))}
              </div>

              {/* Close */}
              <button
                onClick={closeLoginModal}
                className="w-full mt-4 text-center text-sm font-medium text-muted hover:text-foreground transition-colors py-2"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
