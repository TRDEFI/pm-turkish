import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { TRDEFIVaultABI, TRDEFIVaultAddress } from '@/contracts/TRDEFIVault';
import { parseUnits, formatUnits } from 'viem';

export function useTRDEFIVault(chainId: number = 31337) {
  const address = TRDEFIVaultAddress[chainId as keyof typeof TRDEFIVaultAddress];

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Read functions
  const { data: balance } = useReadContract({
    address,
    abi: TRDEFIVaultABI,
    functionName: 'balances',
    args: [address], // Placeholder, should be user address
  });

  const { data: eventCount } = useReadContract({
    address,
    abi: TRDEFIVaultABI,
    functionName: 'eventCount',
  });

  // Write functions
  const deposit = (amount: string) => {
    writeContract({
      address,
      abi: TRDEFIVaultABI,
      functionName: 'deposit',
      args: [parseUnits(amount, 6)], // USDC has 6 decimals
    });
  };

  const withdraw = (amount: string) => {
    writeContract({
      address,
      abi: TRDEFIVaultABI,
      functionName: 'withdraw',
      args: [parseUnits(amount, 6)],
    });
  };

  const placeBet = (eventId: number, side: boolean, amount: string) => {
    writeContract({
      address,
      abi: TRDEFIVaultABI,
      functionName: 'placeBet',
      args: [BigInt(eventId), side, parseUnits(amount, 6)],
    });
  };

  const claimWinnings = (betId: number) => {
    writeContract({
      address,
      abi: TRDEFIVaultABI,
      functionName: 'claimWinnings',
      args: [BigInt(betId)],
    });
  };

  return {
    address,
    balance: balance ? formatUnits(balance as bigint, 6) : '0',
    eventCount: eventCount ? Number(eventCount) : 0,
    deposit,
    withdraw,
    placeBet,
    claimWinnings,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
