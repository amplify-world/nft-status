import { useState, useCallback, useEffect, useRef } from "react";
import "./index.css";
import "@google/model-viewer";
import { fetchOwnedNfts, checkNftStatus, resolveEvmToAccountId, fetchNftMetadata, fetchSingleNftMetadataUri, type OwnedNft } from "./api";
import { NFT_CONTRACTS } from "./config";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
        "interaction-prompt"?: string;
        ar?: boolean;
      };
    }
  }
}

// ─── EIP-6963: discover all injected wallet providers ────────────────────────

interface WalletProvider {
  info: { uuid: string; name: string; icon: string };
  provider: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
}

function discoverWallets(onFound: (w: WalletProvider) => void): () => void {
  const handler = (e: Event) =>
    onFound((e as CustomEvent<WalletProvider>).detail);
  window.addEventListener("eip6963:announceProvider", handler);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  return () => window.removeEventListener("eip6963:announceProvider", handler);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "wallet" | "single" | null;
type StatusState = "loading" | "used" | "unused" | "error";

interface SingleResult {
  tokenId: string;
  serialNumber: number;
  statusState: "used" | "unused";
  usedAt?: string;
  metadataUri?: string;
}

interface NftCard extends OwnedNft {
  statusState: StatusState;
  usedAt?: string;
  error?: string;
  imageUrl?: string;
  isModel?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidAccountId(id: string) {
  return /^\d+\.\d+\.\d+$/.test(id.trim());
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ state, usedAt, error }: { state: StatusState; usedAt?: string; error?: string }) {
  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 text-white/30 text-sm">
        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Checking…
      </div>
    );
  }
  if (state === "error") {
    return <span className="text-red-400 text-xs">{error ?? "Error"}</span>;
  }
  if (state === "unused") {
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 text-xs font-medium px-2.5 py-1 rounded-full border border-emerald-500/20">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Available
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-center gap-1.5 bg-orange-500/15 text-orange-400 text-xs font-medium px-2.5 py-1 rounded-full border border-orange-500/20 w-fit">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        Used
      </span>
      {usedAt && <span className="text-white/30 text-xs ml-1">Used {formatDate(usedAt)}</span>}
    </div>
  );
}

// ─── NFT card ─────────────────────────────────────────────────────────────────

function NftCardItem({ nft }: { nft: NftCard }) {
  const [imageUrl, setImageUrl] = useState(nft.imageUrl);
  const [isModel, setIsModel] = useState(nft.isModel ?? false);
  const [mediaLoading, setMediaLoading] = useState(!!nft.metadataUri && !nft.imageUrl);

  useEffect(() => {
    if (!nft.metadataUri || nft.imageUrl) return;
    fetchNftMetadata(nft.metadataUri)
      .then(({ imageUrl, isModel }) => {
        setImageUrl(imageUrl);
        setIsModel(isModel);
      })
      .catch(() => {})
      .finally(() => setMediaLoading(false));
  }, [nft.metadataUri, nft.imageUrl]);

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden flex flex-col hover:bg-white/[0.05] transition-colors">

      {/* Media */}
      <div className="h-48 w-full bg-white/[0.02] relative">
        {mediaLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="animate-spin w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        )}
        {!mediaLoading && isModel && imageUrl && (
          <model-viewer
            src={imageUrl}
            alt={nft.contractName}
            camera-controls
            auto-rotate
            interaction-prompt="none"
            style={{ display: "block", width: "100%", height: "100%" }}
          />
        )}
        {!mediaLoading && !isModel && imageUrl && (
          <img src={imageUrl} alt={nft.contractName} className="w-full h-full object-cover" />
        )}
        {!mediaLoading && !imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-10 h-10 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-white/80 text-sm font-medium leading-snug">{nft.contractName}</p>
          <span className="shrink-0 text-white/20 text-xs font-mono bg-white/[0.04] px-2 py-0.5 rounded">
            #{nft.serialNumber}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <StatusBadge state={nft.statusState} usedAt={nft.usedAt} error={nft.error} />
          <span className="text-white/20 text-xs font-mono">{nft.tokenId}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Serial number info popover ───────────────────────────────────────────────

function SerialNumberInfo() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 text-white/40 hover:text-white/70 flex items-center justify-center transition-colors cursor-pointer"
        aria-label="What is a serial number?"
      >
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-6 z-20 w-72 rounded-xl bg-[#1a1a2e] border border-white/10 shadow-2xl p-4">
            <p className="text-white/80 text-sm font-medium mb-2">Where to find the serial number</p>
            <p className="text-white/50 text-xs leading-relaxed mb-3">
              Each NFT in a collection has a unique serial number (e.g. #42). You can find it in:
            </p>
            <ul className="space-y-1.5">
              {[
                ["HashScan", "Search the token ID on hashscan.io and browse NFTs"],
                ["SentX", "View the NFT listing on sentx.io — the serial number is shown on each item"],
                ["HashPack", "Open your wallet, tap the NFT, and look for the serial or token number"],
              ].map(([title, desc]) => (
                <li key={title} className="flex gap-2">
                  <span className="text-violet-400 text-xs font-medium shrink-0 mt-0.5">{title}</span>
                  <span className="text-white/30 text-xs leading-relaxed">{desc}</span>
                </li>
              ))}
            </ul>
          </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState<Mode>(null);

  // ── Wallet mode state ──
  const [phase, setPhase] = useState<"connect" | "scanning" | "results">("connect");
  const [accountId, setAccountId] = useState("");
  const [nfts, setNfts] = useState<NftCard[]>([]);
  const [connectError, setConnectError] = useState("");
  const [wallets, setWallets] = useState<WalletProvider[]>([]);

  // ── Single check state ──
  const [singleTokenId, setSingleTokenId] = useState(NFT_CONTRACTS[0].tokenId);
  const [singleSerial, setSingleSerial] = useState("");
  const [singleChecking, setSingleChecking] = useState(false);
  const [singleResult, setSingleResult] = useState<SingleResult | null>(null);
  const [singleError, setSingleError] = useState("");

  useEffect(() => {
    return discoverWallets((w) =>
      setWallets((prev) =>
        prev.find((x) => x.info.uuid === w.info.uuid) ? prev : [...prev, w]
      )
    );
  }, []);

  const scan = useCallback(async (id: string) => {
    try {
      const owned = await fetchOwnedNfts(id);
      const cards: NftCard[] = owned.map((n) => ({ ...n, statusState: "loading" }));
      setNfts(cards);
      setPhase("results");

      owned.forEach((nft, i) => {
        checkNftStatus(nft.tokenId, nft.serialNumber)
          .then((result) => {
            setNfts((prev) =>
              prev.map((c, ci) => ci === i ? { ...c, statusState: result.status, usedAt: result.usedAt } : c)
            );
          })
          .catch((err) => {
            setNfts((prev) =>
              prev.map((c, ci) =>
                ci === i ? { ...c, statusState: "error", error: err instanceof Error ? err.message : "Unknown error" } : c
              )
            );
          });
      });
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed to scan wallet");
      setPhase("connect");
    }
  }, []);

  const connectWith = useCallback(async (wallet: WalletProvider) => {
    setConnectError("");
    setPhase("scanning");
    try {
      console.log("Connecting to wallet:", wallet.info);
      const isHashPack = wallet.info.rdns === "app.hashpack";
      if (!isHashPack) {
        await wallet.provider.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      }
      const accounts = await wallet.provider.request({ method: "eth_requestAccounts" }) as string[];
      console.log("Accounts from wallet:", accounts);
      if (!accounts?.[0]) throw new Error("No account returned from wallet");
      console.log("Resolving EVM address:", accounts[0]);
      const id = await resolveEvmToAccountId(accounts[0]);
      console.log("Resolved Hedera account ID:", id);
      setAccountId(id);
      await scan(id);
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setConnectError(err instanceof Error ? err.message : "Wallet connection failed");
      setPhase("connect");
    }
  }, [scan]);

  const connectManual = useCallback(async () => {
    setConnectError("");
    setPhase("scanning");
    await scan(accountId.trim());
  }, [accountId, scan]);

  const disconnect = () => {
    setMode(null);
    setPhase("connect");
    setAccountId("");
    setNfts([]);
    setConnectError("");
  };

  const checkSingle = useCallback(async () => {
    const serial = parseInt(singleSerial.trim(), 10);
    if (isNaN(serial)) return;
    setSingleChecking(true);
    setSingleError("");
    setSingleResult(null);
    try {
      const contract = NFT_CONTRACTS.find(c => c.tokenId === singleTokenId);
      const [status, metadataUri] = await Promise.all([
        checkNftStatus(singleTokenId, serial),
        contract?.metadataCid
          ? Promise.resolve(`ipfs://${contract.metadataCid}`)
          : fetchSingleNftMetadataUri(singleTokenId, serial),
      ]);
      setSingleResult({ tokenId: singleTokenId, serialNumber: serial, statusState: status.status, usedAt: status.usedAt, metadataUri });
    } catch (err) {
      setSingleError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setSingleChecking(false);
    }
  }, [singleTokenId, singleSerial]);

  const loadingCount = nfts.filter((n) => n.statusState === "loading").length;
  const availableCount = nfts.filter((n) => n.statusState === "unused").length;
  const usedCount = nfts.filter((n) => n.statusState === "used").length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center px-4 py-12" style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* Background glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-7xl">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            Stake NFT Check
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
            NFT Status
          </h1>
          <p className="mt-2 text-sm text-white/40">Find out if AmplifyWorld NFTs have been used on Stake</p>
        </div>

        {/* ── Mode picker ── */}
        {mode === null && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
            <button
              onClick={() => setMode("wallet")}
              className="w-full flex flex-col items-start gap-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] p-7 hover:bg-white/[0.06] hover:border-violet-500/30 transition-all cursor-pointer text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3m18 0V6" />
                </svg>
              </div>
              <div>
                <p className="text-white/90 font-semibold text-base">My Wallet</p>
                <p className="text-white/40 text-sm mt-1">Connect your wallet and scan all your AmplifyWorld NFTs at once</p>
              </div>
            </button>
            <button
              onClick={() => setMode("single")}
              className="w-full flex flex-col items-start gap-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] p-7 hover:bg-white/[0.06] hover:border-violet-500/30 transition-all cursor-pointer text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center">
                <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div>
                <p className="text-white/90 font-semibold text-base">Check an NFT</p>
                <p className="text-white/40 text-sm mt-1">Look up a specific NFT by serial number before buying</p>
              </div>
            </button>
          </div>
        )}

        {/* ── Single check ── */}
        {mode === "single" && (
          <div className="flex flex-col items-center">
            <div className={`w-full ${singleResult ? "max-w-3xl" : "max-w-lg"}`}>
              <button onClick={() => { setMode(null); setSingleResult(null); setSingleError(""); }} className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-sm mb-6 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>

            <div className={`flex flex-col gap-6 items-center ${singleResult ? "lg:flex-row lg:items-start" : ""}`}>
              {/* Form */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm p-6 shadow-2xl w-full">
                <h2 className="text-base font-semibold text-white/90 mb-1">Check an NFT</h2>
                <p className="text-white/40 text-sm mb-5">Look up a specific NFT before buying</p>

                <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">Collection</label>
                <select
                  value={singleTokenId}
                  onChange={(e) => setSingleTokenId(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-all appearance-none cursor-pointer"
                >
                  {NFT_CONTRACTS.map((c) => (
                    <option key={c.tokenId} value={c.tokenId} className="bg-[#0a0a0f]">
                      {c.symbol ?? c.name} ({c.tokenId})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2 mt-4 mb-1.5">
                  <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Serial Number</label>
                  <SerialNumberInfo />
                </div>
                <input
                  type="number"
                  value={singleSerial}
                  onChange={(e) => setSingleSerial(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && singleSerial && checkSingle()}
                  placeholder="e.g. 42"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-all font-mono"
                />

                {singleError && (
                  <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                    <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {singleError}
                  </div>
                )}

                <button
                  onClick={checkSingle}
                  disabled={!singleSerial.trim() || singleChecking}
                  className="mt-4 w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {singleChecking ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Checking…
                    </>
                  ) : "Check Status"}
                </button>
              </div>

              {/* Result */}
              {singleResult && (
                <div className="w-full lg:max-w-xs rounded-xl overflow-hidden border border-white/[0.08]">
                  <NftCardItem nft={{ ...singleResult, contractName: (() => { const c = NFT_CONTRACTS.find(c => c.tokenId === singleResult.tokenId); return c ? (c.symbol ?? c.name) : singleResult.tokenId; })() }} />
                </div>
              )}
            </div>
            </div>
          </div>
        )}

        {/* ── Connect phase ── */}
        {mode === "wallet" && phase === "connect" && (
          <div className="max-w-lg mx-auto w-full">
            <button onClick={() => setMode(null)} className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-sm mb-6 transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm p-6 shadow-2xl w-full">
            <h2 className="text-base font-semibold text-white/90 mb-1">Connect Wallet</h2>
            <p className="text-white/40 text-sm mb-5">Scan your wallet for AmplifyWorld NFTs</p>

            {wallets.length > 0 ? (
              <div className="flex flex-col gap-2">
                {wallets.map((wallet) => (
                  <button
                    key={wallet.info.uuid}
                    onClick={() => connectWith(wallet)}
                    className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-3"
                  >
                    <img src={wallet.info.icon} alt="" className="w-5 h-5 rounded" />
                    {wallet.info.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-sm text-center py-1">No wallet extensions detected</p>
            )}

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/[0.08]" />
              <span className="text-white/20 text-xs">or</span>
              <div className="flex-1 h-px bg-white/[0.08]" />
            </div>

            <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
              Enter Account ID manually
            </label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && isValidAccountId(accountId) && connectManual()}
              placeholder="0.0.12345"
              spellCheck={false}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/60 focus:bg-white/[0.06] transition-all font-mono"
            />
            <button
              onClick={connectManual}
              disabled={!isValidAccountId(accountId)}
              className="mt-3 w-full py-3 px-4 rounded-xl border border-white/10 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium text-white/60 hover:text-white/90 transition cursor-pointer"
            >
              Continue
            </button>

            {connectError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {connectError}
              </div>
            )}
          </div>
          </div>
        )}

        {/* ── Scanning phase ── */}
        {mode === "wallet" && phase === "scanning" && (
          <div className="flex flex-col items-center gap-4 mt-8">
            <svg className="animate-spin w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-white/50 text-sm">Scanning wallet for AmplifyWorld NFTs…</p>
          </div>
        )}

        {/* ── Results phase ── */}
        {mode === "wallet" && phase === "results" && (
          <div>
            <div className="flex items-center justify-between mb-6 px-1">
              <div>
                <p className="text-white/30 text-xs uppercase tracking-wide mb-0.5">Connected</p>
                <p className="text-white/70 text-sm font-mono">{accountId}</p>
              </div>
              <button onClick={disconnect} className="text-white/30 hover:text-white/60 text-sm transition-colors cursor-pointer">
                Disconnect
              </button>
            </div>

            {nfts.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-white/90">{nfts.length}</p>
                  <p className="text-white/30 text-xs mt-0.5">Total NFTs</p>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{loadingCount > 0 ? "…" : availableCount}</p>
                  <p className="text-white/30 text-xs mt-0.5">Available</p>
                </div>
                <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-orange-400">{loadingCount > 0 ? "…" : usedCount}</p>
                  <p className="text-white/30 text-xs mt-0.5">Used</p>
                </div>
              </div>
            )}

            {nfts.length === 0 ? (
              <div className="text-center py-16 text-white/30">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm">No AmplifyWorld NFTs found in this wallet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {nfts.map((nft) => (
                  <NftCardItem key={`${nft.tokenId}-${nft.serialNumber}`} nft={nft} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
