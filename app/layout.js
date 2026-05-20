import { Inter } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Polymarket Yatırımcı Panosu',
  description: 'Gerçek zamanlı piyasa verileri - Türkiye\'de erişilebilir',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
