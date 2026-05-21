import abi from './TRDEFIVault.json';

export const TRDEFIVaultABI = abi as any[];

// Contract addresses (TBD - update after deployment)
export const TRDEFIVaultAddress = {
  137: '0x0000000000000000000000000000000000000000', // Polygon Mainnet
  80002: '0x0000000000000000000000000000000000000000', // Polygon Amoy
  31337: '0x0000000000000000000000000000000000000000', // Localhost
} as const;
