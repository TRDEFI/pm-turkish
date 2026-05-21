'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-xl font-bold text-indigo-600">
          TRDEFI
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/events" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Events
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
            Dashboard
          </Link>
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
