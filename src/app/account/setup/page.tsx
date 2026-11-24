"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type Step = 1 | 2 | 3;

export default function AccountSetupPage() {
  const { user, setUser, isLoggedIn, isLoading, pendingAction, clearPendingAction } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form data
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [shopName, setShopName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [businessType, setBusinessType] = useState("");

  const [addressLine, setAddressLine] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace("/");
    }
  }, [isLoading, isLoggedIn, router]);

  // Fetch and pre-fill existing data
  useEffect(() => {
    async function loadProfile() {
      if (!isLoggedIn) return;
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const { user: profile } = await res.json();
          if (profile) {
            if (profile.name) setName(profile.name);
            if (profile.whatsapp_number) setWhatsapp(profile.whatsapp_number);
            else if (profile.phone_number) setWhatsapp(profile.phone_number);

            if (profile.business_profile) {
              setShopName(profile.business_profile.shop_name || "");
              setGstNumber(profile.business_profile.gst_number || "");
              setPanNumber(profile.business_profile.pan_number || "");
              setBusinessType(profile.business_profile.business_type || "");
            }

            if (profile.address) {
              setAddressLine(profile.address.address_line || "");
              setLandmark(profile.address.landmark || "");
              setCity(profile.address.city || "");
              setState(profile.address.state || "");
              setPincode(profile.address.pincode || "");
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    }
    loadProfile();
  }, [isLoggedIn]);

  async function handleFinish() {
    if (!user) return;

    if (!name.trim() || !shopName.trim()) {
      setError("Name and shop name are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          name: name.trim(),
          whatsapp_number: whatsapp.trim(),
          shop_name: shopName.trim(),
          gst_number: gstNumber.trim() || null,
          pan_number: panNumber.trim() || null,
          business_type: businessType.trim() || null,
          address_line: addressLine.trim() || null,
          landmark: landmark.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          pincode: pincode.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Setup failed");
      }

      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      }

      // Resume pending action
      if (pendingAction?.returnUrl) {
        clearPendingAction();
        router.push(pendingAction.returnUrl);
      } else {
        router.push("/account");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const ic = "w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep((s) => (s - 1) as Step) : router.push("/account")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            {step > 1 ? "Back" : "Home"}
          </button>
          <span className="text-xs font-medium text-muted">Step {step} of 3</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mx-auto max-w-lg px-4 pt-4">
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                s <= step ? "bg-primary" : "bg-surface"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400 font-medium">
            ⚠ {error}
          </div>
        )}

        {/* ═══ STEP 1 — Personal Info ═══ */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Personal Details</h1>
              <p className="text-sm text-muted mt-1">Tell us about yourself</p>
            </div>

            <div className="rounded-2xl border border-card-border bg-card-bg p-5 sm:p-6 space-y-5">
              <div>
                <label htmlFor="setup-name" className="block text-sm font-semibold text-foreground mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="setup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className={ic}
                />
              </div>

              <div>
                <label htmlFor="setup-wa" className="block text-sm font-semibold text-foreground mb-2">
                  WhatsApp Number
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">+91</span>
                  <input
                    id="setup-wa"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
                    placeholder="WhatsApp number"
                    className={`${ic} pl-14`}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!name.trim()) { setError("Name is required"); return; }
                setError("");
                setStep(2);
              }}
              className="w-full mt-6 rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200"
            >
              Continue
            </button>
          </div>
        )}

        {/* ═══ STEP 2 — Business Info ═══ */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Business Details</h1>
              <p className="text-sm text-muted mt-1">Help us serve you better with GST billing</p>
            </div>

            <div className="rounded-2xl border border-card-border bg-card-bg p-5 sm:p-6 space-y-5">
              <div>
                <label htmlFor="setup-shop" className="block text-sm font-semibold text-foreground mb-2">
                  Shop / Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="setup-shop"
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Krishna Agro Store"
                  className={ic}
                />
              </div>

              <div>
                <label htmlFor="setup-btype" className="block text-sm font-semibold text-foreground mb-2">
                  Business Type
                </label>
                <select
                  id="setup-btype"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className={`${ic} appearance-none cursor-pointer`}
                >
                  <option value="">Select type</option>
                  <option value="retailer">Retailer</option>
                  <option value="distributor">Distributor</option>
                  <option value="dealer">Dealer</option>
                  <option value="farmer">Farmer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="setup-gst" className="block text-sm font-semibold text-foreground mb-2">
                  GST Number <span className="text-xs text-muted font-normal">(optional)</span>
                </label>
                <input
                  id="setup-gst"
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className={ic}
                />
              </div>

              <div>
                <label htmlFor="setup-pan" className="block text-sm font-semibold text-foreground mb-2">
                  PAN Number <span className="text-xs text-muted font-normal">(optional)</span>
                </label>
                <input
                  id="setup-pan"
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className={ic}
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!shopName.trim()) { setError("Shop name is required"); return; }
                setError("");
                setStep(3);
              }}
              className="w-full mt-6 rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200"
            >
              Continue
            </button>
          </div>
        )}

        {/* ═══ STEP 3 — Address ═══ */}
        {step === 3 && (
          <div className="animate-fade-in-up">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Shipping Address</h1>
              <p className="text-sm text-muted mt-1">Where should we deliver your orders?</p>
            </div>

            <div className="rounded-2xl border border-card-border bg-card-bg p-5 sm:p-6 space-y-5">
              <div>
                <label htmlFor="setup-addr" className="block text-sm font-semibold text-foreground mb-2">
                  Address Line
                </label>
                <input
                  id="setup-addr"
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Shop no / Street / Area"
                  className={ic}
                />
              </div>

              <div>
                <label htmlFor="setup-landmark" className="block text-sm font-semibold text-foreground mb-2">
                  Landmark <span className="text-xs text-muted font-normal">(optional)</span>
                </label>
                <input
                  id="setup-landmark"
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near temple, bus stop etc."
                  className={ic}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="setup-city" className="block text-sm font-semibold text-foreground mb-2">City</label>
                  <input id="setup-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={ic} />
                </div>
                <div>
                  <label htmlFor="setup-pin" className="block text-sm font-semibold text-foreground mb-2">Pincode</label>
                  <input id="setup-pin" type="tel" inputMode="numeric" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))} placeholder="700001" className={ic} />
                </div>
              </div>

              <div>
                <label htmlFor="setup-state" className="block text-sm font-semibold text-foreground mb-2">State</label>
                <select id="setup-state" value={state} onChange={(e) => setState(e.target.value)} className={`${ic} appearance-none cursor-pointer`}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full mt-6 rounded-xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg disabled:opacity-50 hover:shadow-xl active:scale-[0.98] transition-all duration-200"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                "Complete Setup ✓"
              )}
            </button>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full mt-3 text-center text-sm font-medium text-muted hover:text-foreground transition-colors py-2"
            >
              Skip address for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];
