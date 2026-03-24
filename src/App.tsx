import "./index.css";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4" style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* Background glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-violet-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-900/20 blur-[120px]" />
      </div>

      <div className="relative text-center max-w-md">
        <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          Offline
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent mb-4">
          StakeScan
        </h1>
        <p className="text-white/50 text-base leading-relaxed">
          StakeScan is currently offline.<br />Please check back later.
        </p>
      </div>

    </div>
  );
}
