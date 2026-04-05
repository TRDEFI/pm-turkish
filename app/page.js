import MarketsGrid from '../components/MarketsGrid';
import CryptoGrid from '../components/CryptoGrid';
import EventsSection from '../components/EventsSection';

/**
 * Main landing page for Polymarket Turkish Investor Dashboard
 * Displays BTC live market + grid of active markets with Turkish translations
 * + AI-generated prediction events (LLM powered, TR-focused)
 */
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center space-x-3">
              {/* Logo: TRDEFI gold/black */}
              <img src="/logo.jpg" alt="TRDEFI" className="w-12 h-12 rounded-xl object-cover shadow-lg" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold gradient-text">
                  Polymarket Yatırımcı Panosu
                </h1>
                <p className="text-slate-400 text-xs md:text-sm">
                  Gerçek zamanlı veriler
                </p>
              </div>
            </div>
            <div className="mt-3 md:mt-0">
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 pulse-glow">
                <span className="w-2 h-2 mr-2 bg-emerald-400 rounded-full animate-pulse"></span>
                Canlı
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Crypto 5-Dakika Grid */}
        <CryptoGrid />

        {/* Polymarket Markets */}
        <MarketsGrid />

        {/* AI Generated Events */}
        <EventsSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-16 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="text-center md:text-left">
              <p className="text-slate-400 text-sm">
                © 2025 - 2026 TRDEFI LTD
              </p>
              <div className="text-slate-500 text-xs mt-1 space-y-0.5">
                <p>Company number 14367961</p>
                <p>Suite 419, Office 408, Screenworks 22 Highbury Grove, London, United Kingdom, N5 2ER</p>
                <p>Contact: <a href="mailto:info@trdefi.com" className="text-blue-400 hover:text-blue-300 transition-colors">info@trdefi.com</a></p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-500 text-center">
            <p>Bu bir açık kaynak projesidir. Polymarket ile resmi olarak bağlantılı değildir.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
