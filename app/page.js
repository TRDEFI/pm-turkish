import MarketsGrid from '../components/MarketsGrid';
import CryptoGrid from '../components/CryptoGrid';
import GeneratedEventsSection from '../components/GeneratedEventsSection';
import '../lib/fonts.css';

/* ─── Animated Background ─────────────────────────────────────────────── */
function AmbientBG() {
  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none select-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Top violet glow */}
      <div style={{
        position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
        width: '1000px', height: '600px',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(120,80,255,0.09) 0%, transparent 65%)',
        animation: 'glow-pulse 8s ease-in-out infinite',
      }} />
      {/* Bottom cyan glow */}
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%',
        width: '700px', height: '500px',
        background: 'radial-gradient(ellipse at 100% 100%, rgba(56,189,248,0.05) 0%, transparent 60%)',
        animation: 'glow-pulse 12s ease-in-out infinite reverse',
      }} />
      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.02,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
      }} />
      {/* Moving gradient orb */}
      <div style={{
        position: 'absolute', top: '20%', left: '70%', width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(129,140,248,0.04) 0%, transparent 70%)',
        animation: 'orb-drift 20s ease-in-out infinite',
      }} />

      <style>{`
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.8; transform: translateX(-50%) scale(1); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
        }
        @keyframes orb-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(1.1); }
          66% { transform: translate(20px, -20px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}

/* ─── Section Header ───────────────────────────────────────────────── */
function SectionHeader({ accentColor, badge, badgeColor, badgeTextColor, title, subtitle, count }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        {/* Neon accent bar */}
        <div style={{
          width: '4px', height: '36px', borderRadius: '4px',
          background: accentColor,
          boxShadow: `0 0 12px ${accentColor}80, 0 0 24px ${accentColor}40`,
        }} />
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-[16px] font-bold text-white tracking-tight"
              style={{ textShadow: '0 0 30px rgba(255,255,255,0.15)' }}>
              {title}
            </h2>
            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider"
              style={{
                background: badgeColor,
                color: badgeTextColor,
                border: `1px solid ${badgeTextColor}30`,
                boxShadow: `0 0 12px ${badgeTextColor}20`,
              }}>
              {badge}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">{subtitle} · {count}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Category Pills ─────────────────────────────────────────────────── */
const CATS = [
  { key: 'hava',        emoji: '🌤️', color: '#38bdf8', label: 'Hava' },
  { key: 'kripto-gun',  emoji: '📈', color: '#fbbf24', label: 'Kripto Gün' },
  { key: 'kripto-5dk', emoji: '⚡', color: '#f97316', label: 'Kripto 5dk' },
  { key: 'doviz',       emoji: '💱', color: '#34d399', label: 'Döviz' },
];

function QuickCategoryBar() {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {CATS.map(cat => (
        <div key={cat.key}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all"
          style={{
            background: `${cat.color}0a`,
            borderColor: `${cat.color}25`,
            color: cat.color,
            boxShadow: `0 0 10px ${cat.color}10`,
          }}>
          <span>{cat.emoji}</span>
          <span>{cat.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Hero Stats Bar ───────────────────────────────────────────────── */
function HeroStats() {
  return (
    <div className="mb-8 rounded-2xl p-4 border flex items-center justify-between gap-4 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(120,80,255,0.06) 0%, rgba(56,189,248,0.04) 100%)',
        borderColor: 'rgba(129,140,248,0.12)',
        boxShadow: '0 0 40px rgba(120,80,255,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
      <div className="flex items-center gap-3">
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #7c3aed, #38bdf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(124,58,237,0.4)',
        }}>
          <span className="text-white font-black text-sm">T</span>
        </div>
        <div>
          <div className="text-[13px] font-bold text-white">TRDEFI Tahmin Panosu</div>
          <div className="text-[10px] text-slate-500">Canlı piyasa verileri · Türkiye</div>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-6">
        {[
          { label: 'Aktif Olaylar', value: '24/7', color: '#34d399' },
          { label: 'Kaynak', value: 'Gate.io', color: '#38bdf8' },
          { label: 'Veri', value: 'Canlı', color: '#fbbf24' },
        ].map(stat => (
          <div key={stat.label} className="text-center">
            <div className="text-[13px] font-black tabular-nums"
              style={{ color: stat.color, textShadow: `0 0 15px ${stat.color}60` }}>
              {stat.value}
            </div>
            <div className="text-[9px] text-slate-600 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Live pulse */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold shrink-0"
        style={{
          background: 'rgba(52,211,153,0.08)',
          border: '1px solid rgba(52,211,153,0.2)',
          color: '#34d399',
          boxShadow: '0 0 15px rgba(52,211,153,0.15)',
        }}>
        <span style={{
          display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
          background: '#34d399',
          boxShadow: '0 0 6px #34d399',
          animation: 'live-pulse 1.5s ease-in-out infinite',
        }} />
        CANLI
      </div>

      <style>{`
        @keyframes live-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="min-h-screen text-white" style={{ background: '#070810' }}>
      <AmbientBG />

      {/* Header */}
      <header className="sticky top-0 z-50" style={{
        backdropFilter: 'blur(24px)',
        background: 'rgba(7,8,16,0.88)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.4)',
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #7c3aed, #38bdf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(124,58,237,0.4), 0 0 40px rgba(56,189,248,0.2)',
                }}>
                  <span className="text-white font-black text-sm">T</span>
                </div>
                {/* Glow ring */}
                <div style={{
                  position: 'absolute', inset: '-3px', borderRadius: '13px',
                  background: 'linear-gradient(135deg, #7c3aed, #38bdf8)',
                  opacity: 0.3, filter: 'blur(6px)', zIndex: -1,
                }} />
              </div>
              <div>
                <h1 className="text-[14px] font-bold tracking-tight text-white leading-none">
                  TRDEFI <span className="text-slate-500 font-normal">·</span>{' '}
                  <span style={{ color: '#a78bfa' }}>Tahmin Panosu</span>
                </h1>
                <p className="text-[10px] text-slate-600 mt-0.5 leading-none">Canlı hava, kripto & piyasa verileri</p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2.5">
              <a href="/past-log"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                📋 Geçmiş
              </a>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold"
                style={{
                  background: 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.2)',
                  color: '#34d399',
                  boxShadow: '0 0 12px rgba(52,211,153,0.1)',
                }}>
                <span style={{
                  display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                  background: '#34d399',
                  boxShadow: '0 0 6px #34d399',
                  animation: 'live-pulse 1.5s ease-in-out infinite',
                }} />
                CANLI
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10 relative" style={{ zIndex: 10 }}>

        {/* Hero Stats */}
        <HeroStats />

        {/* ── Kısa Süreli Tahminler ── */}
        <section>
          <SectionHeader
            accentColor="#f97316"
            badge="⚡ OTOMATİK"
            badgeColor="rgba(249,115,22,0.1)"
            badgeTextColor="#fbbf24"
            title="Kısa Süreli Tahminler"
            subtitle="Her 5 dakikada yenilenen Gate.io verileri"
            count="3 aktif"
          />
          <CryptoGrid />
        </section>

        {/* ── Günlük Tahminler ── */}
        <section>
          <SectionHeader
            accentColor="#38bdf8"
            badge="🤖 OPENROUTER AI"
            badgeColor="rgba(56,189,248,0.08)"
            badgeTextColor="#38bdf8"
            title="Günlük Tahminler"
            subtitle="Her gün 00:00'da AI tarafından oluşturulur"
            count="17+ olay"
          />
          <QuickCategoryBar />

          <div className="mt-4 rounded-2xl p-5 border"
            style={{
              background: 'rgba(11,13,23,0.8)',
              borderColor: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)',
            }}>
            <GeneratedEventsSection />
          </div>
        </section>

        {/* ── Polymarket Piyasaları ── */}
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
            style={{
              background: 'rgba(11,13,23,0.8)',
              borderColor: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)',
            }}>
            <MarketsGrid />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-[11px] text-slate-700 space-y-1">
              <p>© 2025–2026 TRDEFI LTD · Company 14367961 · England &amp; Wales</p>
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
