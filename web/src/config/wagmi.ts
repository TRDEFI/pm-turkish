import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, polygonAmoy, hardhat } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export const config = getDefaultConfig({
  appName: 'TRDEFI Prediction Market',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [polygon, polygonAmoy, hardhat],
  ssr: true,
});

export { queryClient };
