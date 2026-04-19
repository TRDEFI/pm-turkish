import MarketsGrid from '../components/MarketsGrid';
import CryptoGrid from '../components/CryptoGrid';
import GeneratedEventsSection from '../components/GeneratedEventsSection';
import '../lib/fonts.css';

/* ─── Category accent colors ─────────────────────────────────────────── */
const CAT_COLORS = {
  hava:       { color: '#38bdf8', label: 'Hava',       emoji: '🌤️',  bg: 'rgba(56,189,248,0.06)',  border: 'rgba(56,189,248,0.15)' },
  'kripto-gun':  { color: '#fbbf24', label: 'Kripto Gün', emoji: '📈',  bg: 'rgba(251,191,36,0.06)',   border: 'rgba(251,191,36,0.15)' },
  'kripto-5dk':  { color: '#f97316', label: 'Kripto 5dk', emoji: '⚡',  bg: 'rgba(249,115,22,0.06)',   border: 'rgba(249,115,22,0.15)' },
  doviz:      { color: '#34d399', label: 'Döviz',       emoji: '💱',  bg: 'rgba(52,211,153,0.06)',   border: 'rgba(52,211,153,0.15)' },
};

export default function Home() {
  return (
    <div className="min-h-screen text-white" style={{ background: '#070810' }}>

      {/* ── Ambient background ─────────────────────────────────────── */}
      <div aria-hidden="true" className="fixed inset-0 pointer-events-none select-none overflow-hidden">
        {/* Top violet glow */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(120,80,255,0.07) 0%, transparent 65%)' }} />
        {/* Bottom right subtle glow */}
        <div className="absolute bottom-[0%] right-[-10%] w-[600px] h-[400px]"
          style={{ background: 'radial-gradient(ellipse at 100% 100%, rgba(56,189,248,0.04) 0%, transparent 60%)' }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }} />
      </div>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50" style={{ backdropFilter: 'blur(20px)', background: 'rgba(7,8,16,0.85)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Logo + Brand */}
            <div className="flex items-center gap-3">
              {/* Logo mark */}
              <div className="relative">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #38bdf8)' }}>
                  T
                </div>
                {/* Glow */}
                <div className="absolute inset-0 rounded-xl blur-md opacity-40"
                  style={{ background: 'linear-gradient(135deg, #7c3aed55, #38bdf855)' }} />
              </div>
              <div>
                <h1 className="text-[15px] font-bold tracking-tight text-white leading-none">
                  TRDEFI <span className="text-slate-500 font-normal">·</span> <span style={{ color: '#a78bfa' }}>Tahmin Panosu</span>
                </h1>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-none">Canlı hava, kripto & piyasa verileri</p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2.5">
              {/* Live indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold"
                style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: '#34d399' }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: '#34d399' }} />
                </span>
                CANLI
              </div>

              {/* Past predictions */}
              <a href="/past-log"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                📋 Geçmiş
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 relative z-10">

        {/* ── Section: Kısa Süreli Tahminler (5-dk crypto) ────────────── */}
        <section>
          <SectionHeader
            accentColor="#f97316"
            badge="⚡ OTOMATİK"
            badgeColor="rgba(249,115,22,0.12)"
            badgeTextColor="#fbbf24"
            title="Kısa Süreli Tahminler"
            subtitle="Her 5 dakikada yenilenen Gate.io verileri ile"
            count="3 aktif"
          />
          <div className="mt-4">
            <CryptoGrid />
          </div>
        </section>

        {/* ── Section: Günlük Tahminler ─────────────────────────────── */}
        <section>
          <SectionHeader
            accentColor="#38bdf8"
            badge="🤖 OPENROUTER AI"
            badgeColor="rgba(56,189,248,0.08)"
            badgeTextColor="#38bdf8"
            title="Günlük Tahminler"
            subtitle="Her gün 00:00'da AI tarafından oluşturulur"
            count="8+ olay"
          />

          {/* AI categories quick nav */}
          <QuickCategoryBar />

          {/* Card */}
          <div className="mt-4 rounded-2xl p-5 border"
            style={{ background: 'rgba(11,13,23,0.8)', borderColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>
            <GeneratedEventsSection />
          </div>
        </section>

        {/* ── Section: Polymarket Piyasaları ────────────────────────── */}
        <section>
          <SectionHeader
            accentColor="#818cf8"
            badge="🌐 POLYMARKET"
            badgeColor="rgba(129,140,248,0.08)"
            badgeTextColor="#818cf8"
            title="Polymarket Piyasaları"
            subtitle="Gerçek para yatırma gerektirmez — ücretsiz tahmin"
            count="Canlı"
          />

          <div className="mt-4 rounded-2xl p-5 border"
            style={{ background: 'rgba(11,13,23,0.8)', borderColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}>
            <MarketsGrid />
          </div>
        </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="mt-12" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-[11px] text-slate-700 space-y-1">
              <p>© 2025–2026 TRDEFI LTD · Company 14367961 · England & Wales</p>
              <p>Suite 419, Screenworks 22 Highbury Grove, London N5 2ER</p>
            </div>
            <div className="text-[11px] text-slate-600">
              <a href="mailto:info@trdefi.com" className="hover:text-sky-400 transition-colors">info@trdefi.com</a>
              <span className="mx-2 text-slate-800">·</span>
              <a href="https://github.com/TRDEFI" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Section Header Component ─────────────────────────────────────── */
function SectionHeader({ accentColor, badge, badgeColor, badgeTextColor, title, subtitle, count }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Accent bar */}
        <div className="w-[3px] h-7 rounded-full" style={{ background: accentColor, boxShadow: `0 0 12px ${accentColor}60` }} />
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-[16px] font-bold text-white tracking-tight">{title}</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: badgeColor, color: badgeTextColor }}>
              {badge}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">{subtitle} · {count}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Quick Category Bar ─────────────────────────────────────────────── */
const CATS = [
  { key: 'hava',        emoji: '🌤️', color: '#38bdf8', label: 'Hava' },
  { key: 'kripto-gun',  emoji: '📈', color: '#fbbf24', label: 'Kripto Gün' },
  { key: 'kripto-5dk',  emoji: '⚡', color: '#f97316', label: 'Kripto 5dk' },
  { key: 'doviz',       emoji: '💱', color: '#34d399', label: 'Döviz' },
];

function QuickCategoryBar() {
  // This is a visual-only component — tabs are inside GeneratedEventsSection
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {CATS.map(cat => (
        <div key={cat.key}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all"
          style={{
            background: `${cat.color}08`,
            borderColor: `${cat.color}20`,
            color: cat.color,
          }}>
          <span>{cat.emoji}</span>
          <span>{cat.label}</span>
        </div>
      ))}
    </div>
  );
}
