"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Step = "start" | "awaiting-code";

// One page handles both sign-in and first-time account creation: for
// both Google and phone OTP, Supabase creates the auth user on first
// login and our database trigger creates the matching household +
// profile row automatically. There is no separate "create account"
// flow to build or keep in sync with this one.
export default function SignInPage() {
  const supabase = createClient();
  const [step, setStep] = useState<Step>("start");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError("Couldn't start Google sign-in. Try again.");
  }

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (!phone.trim()) {
      setError("Enter a phone number.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: phone.trim(),
      options: { data: { full_name: fullName.trim() } },
    });
    setLoading(false);

    if (error) {
      setError("Couldn't send a code to that number. Check it and try again.");
      return;
    }
    setStep("awaiting-code");
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Enter the code you received.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: phone.trim(),
      token: code.trim(),
      type: "sms",
    });
    setLoading(false);

    if (error) {
      setError("That code is incorrect or expired.");
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8">
        <h1 className="mb-1 text-lg font-semibold">Welcome</h1>
        <p className="mb-6 text-sm text-gray-500">
          Sign in, or create your household account, with Google or your phone
          number.
        </p>

        <button
          onClick={signInWithGoogle}
          className="mb-4 w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium hover:bg-gray-50"
        >
          Continue with Google
        </button>

        <div className="mb-4 flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          or use your phone
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        {step === "start" ? (
          <form onSubmit={sendCode} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Priya Patel"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Phone number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 555 5555"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#3b5bdb] py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                Enter the code sent to {phone}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#3b5bdb] py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Verifying…" : "Verify code"}
            </button>
            <button
              type="button"
              onClick={() => setStep("start")}
              className="w-full text-xs text-gray-500 hover:underline"
            >
              Use a different number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
