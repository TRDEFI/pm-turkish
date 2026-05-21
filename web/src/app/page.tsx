import { Navbar } from '@/components/Navbar';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl space-y-8">
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            Predict the Future. <br />
            <span className="text-indigo-600">Win Together.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            TRDEFI is a decentralized prediction market on Polygon. 
            Make YES/NO predictions on real-world events and earn rewards.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/events"
              className="rounded-full bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Browse Events
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-white px-8 py-3 text-base font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </main>
      <footer className="border-t border-gray-200 bg-white py-8 text-center text-sm text-gray-500">
        <p>&copy; 2026 TRDEFI. All rights reserved.</p>
      </footer>
    </div>
  );
}
