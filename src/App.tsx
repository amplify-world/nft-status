import { useState, useRef } from "react";
import "./index.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type AppStatus = "idle" | "loading" | "used" | "unused" | "error";

interface Result {
  status: "used" | "unused";
  used_at?: string;
}

export default function App() {
  const [tokenAddress, setTokenAddress] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [appStatus, setAppStatus] = useState<AppStatus>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const identifierRef = useRef<HTMLInputElement>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenAddress.trim() || !identifier.trim()) return;

    setAppStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch(
        `${BASE_URL}/api/nfts/status/${encodeURIComponent(tokenAddress.trim())}/${encodeURIComponent(identifier.trim())}`
      );

      if (res.status === 404) {
        const body = await res.json();
        setErrorMsg(body.message ?? "Unknown contract address");
        setAppStatus("error");
        return;
      }
      if (res.status === 429) {
        setErrorMsg("Rate limit exceeded. Please wait a moment and try again.");
        setAppStatus("error");
        return;
      }
      if (!res.ok) {
        setErrorMsg(`Unexpected error (HTTP ${res.status})`);
        setAppStatus("error");
        return;
      }

      const body: Result = await res.json();
      setResult(body);
      setAppStatus(body.status);
    } catch {
      setErrorMsg("Could not reach the server. Is it running?");
      setAppStatus("error");
    }
  }

  function handleReset() {
    setAppStatus("idle");
    setResult(null);
    setErrorMsg("");
  }

  const isUsed = appStatus === "used";
  const isUnused = appStatus === "unused";
  const isLoading = appStatus === "loading";
  const hasResult = isUsed || isUnused;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4" style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* Background glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Stake NFT Check
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
            NFT Status
          </h1>
          <p className="mt-2 text-sm text-white/40">
            Find out if an NFT has been used on Stake
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm p-6 shadow-2xl">

          {!hasResult ? (
            <form onSubmit={handleCheck} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  Contract Address
                </label>
                <input
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && identifierRef.current?.focus()}
                  placeholder="0xabc123..."
                  spellCheck={false}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
                  Token ID
                </label>
                <input
                  ref={identifierRef}
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="42"
                  spellCheck={false}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-all font-mono"
                />
              </div>

              {appStatus === "error" && (
                <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !tokenAddress.trim() || !identifier.trim()}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold tracking-wide transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Checking...
                  </>
                ) : (
                  "Check Status"
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-6">
              {/* Status icon */}
              <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${isUsed ? "bg-orange-500/10 border border-orange-500/30" : "bg-emerald-500/10 border border-emerald-500/30"}`}>
                {isUsed ? (
                  <svg className="w-9 h-9 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                ) : (
                  <svg className="w-9 h-9 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              {/* Status text */}
              <div>
                <div className={`text-2xl font-bold ${isUsed ? "text-orange-400" : "text-emerald-400"}`}>
                  {isUsed ? "Already Used" : "Available"}
                </div>
                <div className="mt-1 text-sm text-white/40">
                  {isUsed
                    ? result?.used_at
                      ? `Used on ${new Date(result.used_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                      : "This NFT has been used"
                    : "This NFT has not been used yet"}
                </div>
              </div>

              {/* Queried values */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 space-y-2 text-left">
                <div className="flex justify-between gap-4 text-xs">
                  <span className="text-white/30 uppercase tracking-wider shrink-0">Contract</span>
                  <span className="font-mono text-white/60 truncate">{tokenAddress}</span>
                </div>
                <div className="flex justify-between gap-4 text-xs">
                  <span className="text-white/30 uppercase tracking-wider shrink-0">Token ID</span>
                  <span className="font-mono text-white/60">{identifier}</span>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full py-2.5 px-4 rounded-xl border border-white/10 hover:bg-white/[0.05] text-sm font-medium text-white/60 hover:text-white/90 transition cursor-pointer"
              >
                Check another
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/20">
          Max 120 requests / minute
        </p>
      </div>
    </div>
  );
}
