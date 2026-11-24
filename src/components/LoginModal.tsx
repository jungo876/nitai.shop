"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { safeReturnUrl } from "@/lib/api-client";
import { IconPackage, IconTag, IconHandshake, IconStar } from "@/components/icons";

type Step = "phone" | "code";

/** Mounted fresh every time the sheet opens, so its state starts clean. */
export default function LoginModal() {
  const { showLoginModal } = useAuth();
  return showLoginModal ? <LoginSheet /> : null;
}

function LoginSheet() {
  const { showLoginModal, closeLoginModal, requestOtp, verifyOtp, pendingAction, clearPendingAction } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const phoneRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the phone field when the sheet opens.
  useEffect(() => {
    const t = setTimeout(() => phoneRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const close = useCallback(() => {
    if (!loading) closeLoginModal();
  }, [loading, closeLoginModal]);

  // Esc closes; Tab stays inside the dialog.
  useEffect(() => {
    if (!showLoginModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])");
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showLoginModal, close]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    const r = await requestOtp(phone);
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      if (r.retryAfterSeconds && r.retryAfterSeconds < 120) {
        // A code was already sent recently — let them type it in.
        setStep("code");
        setResendIn(r.retryAfterSeconds);
      }
      return;
    }
    setStep("code");
    setCode("");
    setResendIn(r.resendAfterSeconds);
    setTimeout(() => codeRef.current?.focus(), 100);
  }

  async function submitCode(e?: React.FormEvent, value = code) {
    e?.preventDefault();
    if (loading) return;
    setError("");
    if (!/^\d{6}$/.test(value)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    const r = await verifyOtp(phone, value);
    setLoading(false);
    if (!r.ok) {
      setError(r.error);
      setCode("");
      codeRef.current?.focus();
      return;
    }
    const target = pendingAction?.returnUrl;
    clearPendingAction();
    if (!r.user.is_profile_complete) {
      router.push(`/account/setup${target ? `?next=${encodeURIComponent(safeReturnUrl(target))}` : ""}`);
    } else if (target) {
      router.push(safeReturnUrl(target));
    }
  }

  if (!showLoginModal) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-fade-in" onClick={close} aria-hidden="true" />

      <div className="fixed bottom-0 left-0 right-0 z-[61] animate-slide-up sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-title"
          className="mx-auto max-w-lg rounded-t-3xl sm:rounded-3xl bg-card-bg border border-card-border shadow-2xl shadow-black/20"
        >
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-card-border" />
          </div>

          <div className="px-6 pb-8 pt-2 sm:pt-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                </svg>
              </div>
              <h2 id="login-title" className="text-xl font-bold text-foreground">
                {step === "phone" ? "Log in with your mobile" : "Enter the code"}
              </h2>
              <p className="text-sm text-muted mt-1">
                {step === "phone" ? (
                  "We'll send a 6-digit code by SMS to confirm it's you."
                ) : (
                  <>
                    Sent to <span className="font-semibold text-foreground">+91 {phone.slice(0, 5)} {phone.slice(5)}</span>{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setStep("phone");
                        setError("");
                        setTimeout(() => phoneRef.current?.focus(), 50);
                      }}
                      className="font-semibold text-primary hover:underline"
                    >
                      Change
                    </button>
                  </>
                )}
              </p>
            </div>

            {step === "phone" ? (
              <form onSubmit={sendCode} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="login-phone" className="block text-sm font-semibold text-foreground mb-2">
                    Mobile number
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">+91</span>
                    <input
                      ref={phoneRef}
                      id="login-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                        setError("");
                      }}
                      placeholder="10-digit mobile number"
                      aria-invalid={!!error}
                      aria-describedby={error ? "login-error" : undefined}
                      className="w-full rounded-xl border border-card-border bg-background pl-14 pr-4 py-3.5 text-base text-foreground placeholder:text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
                {error && <ErrorLine message={error} />}
                <button
                  type="submit"
                  disabled={loading || phone.length !== 10}
                  className="w-full rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg disabled:opacity-50 hover:shadow-xl active:scale-[0.98] transition-all"
                >
                  {loading ? <Spinner label="Sending code…" /> : "Send code"}
                </button>
              </form>
            ) : (
              <form onSubmit={submitCode} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="login-code" className="block text-sm font-semibold text-foreground mb-2">
                    6-digit code
                  </label>
                  <input
                    ref={codeRef}
                    id="login-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setCode(v);
                      setError("");
                      if (v.length === 6) submitCode(undefined, v);
                    }}
                    placeholder="••••••"
                    aria-invalid={!!error}
                    aria-describedby={error ? "login-error" : undefined}
                    className="w-full rounded-xl border border-card-border bg-background px-4 py-3.5 text-center text-2xl font-bold tracking-[0.5em] text-foreground placeholder:text-muted/40 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                {error && <ErrorLine message={error} />}
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg disabled:opacity-50 hover:shadow-xl active:scale-[0.98] transition-all"
                >
                  {loading ? <Spinner label="Verifying…" /> : "Verify & continue"}
                </button>
                <p className="text-center text-sm text-muted">
                  {resendIn > 0 ? (
                    <>Didn&apos;t get it? Resend in {resendIn}s</>
                  ) : (
                    <button type="button" onClick={() => sendCode()} disabled={loading} className="font-semibold text-primary hover:underline disabled:opacity-50">
                      Resend code
                    </button>
                  )}
                </p>
              </form>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              {[
                { icon: IconStar, text: "Faster checkout" },
                { icon: IconPackage, text: "Order tracking" },
                { icon: IconHandshake, text: "Saved addresses" },
                { icon: IconTag, text: "Bulk prices" },
              ].map((b) => (
                <div key={b.text} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
                  <b.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="text-xs font-medium text-muted">{b.text}</span>
                </div>
              ))}
            </div>

            <button onClick={close} className="w-full mt-4 text-center text-sm font-medium text-muted hover:text-foreground transition-colors py-2">
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <p id="login-error" role="alert" className="text-sm text-red-600 dark:text-red-400 font-medium flex items-center gap-1.5">
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
      {message}
    </p>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label}
    </span>
  );
}
