import MarketsGrid from '../components/MarketsGrid';
import CryptoGrid from '../components/CryptoGrid';
import GeneratedEventsSection from '../components/GeneratedEventsSection';

/**
 * Landing Page — VoltAgent dark + Stripe typography + Vercel elevation
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#e4e4e7]">
      {/* ── Top Glow ── */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[320px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(56, 189, 248, 0.06) 0%, transparent 70%)',
        }} />

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0c10]/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
                T
              </div>
              <div>
                <h1 className="text-base font-semibold tracking-tight text-white">TRDEFI · Tahmin Panosu</h1>
                <p className="text-[11px] text-zinc-500">Canlı hava, kripto & piyasa tahminleri</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <a href="/past-log"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-all">
                📋 Geçmiş Tahminler
              </a>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium bg-emerald-500/8 text-emerald-400 border border-emerald-500/15">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Canlı
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
        {/* Crypto 5-Dakika */}
        <CryptoGrid />

        {/* 50/50 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Generated */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full bg-sky-500" />
              <h2 className="text-sm font-semibold text-zinc-200 tracking-tight">Oluşturulan Olaylar</h2>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/15 font-medium">
                LLM
              </span>
            </div>
            <div className="bg-[#111318] rounded-xl border border-white/[0.06] p-4 shadow-[0px_0px_0px_1px_rgba(255,255,255,0.03),0px_4px_16px_rgba(0,0,0,0.3)]">
              <GeneratedEventsSection />
            </div>
          </div>

          {/* RIGHT: Polymarket */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full bg-blue-500" />
              <h2 className="text-sm font-semibold text-zinc-200 tracking-tight">Polymarket Piyasaları</h2>
            </div>
            <div className="bg-[#111318] rounded-xl border border-white/[0.06] p-4 shadow-[0px_0px_0px_1px_rgba(255,255,255,0.03),0px_4px_16px_rgba(0,0,0,0.3)]">
              <MarketsGrid />
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="text-[11px] text-zinc-600 space-y-0.5">
              <p>© 2025–2026 TRDEFI LTD · Company 14367961</p>
              <p>Suite 419, Screenworks 22 Highbury Grove, London N5 2ER</p>
            </div>
            <div className="text-[11px] text-zinc-600">
              <a href="mailto:info@trdefi.com" className="text-zinc-500 hover:text-sky-400 transition-colors">info@trdefi.com</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
