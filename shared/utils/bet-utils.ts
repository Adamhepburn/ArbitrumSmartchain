import { Bet, BetCreationRequest, BetStatus, BetOutcome } from "../schemas/bet-schema";

/**
 * Create a new bet object from a validated creation request
 * @param request The validated bet creation request
 * @param creatorAddress Creator's wallet address
 * @returns A new bet object
 */
export function createBetFromRequest(request: BetCreationRequest, creatorAddress: string): Bet {
  return {
    ...request,
    creatorAddress,
    createdAt: new Date(),
    status: "open" as BetStatus,
    outcome: "notResolved" as BetOutcome,
    acceptorAddress: null,
    network: "Arbitrum Sepolia"
  };
}

/**
 * Calculate the total bet amount (both sides)
 * @param bet The bet object
 * @returns The total amount at stake
 */
export function getTotalBetAmount(bet: Bet): number {
  const amount = parseFloat(bet.betAmount);
  // If bet is accepted, double the amount (both sides have put in money)
  return bet.status === "accepted" ? amount * 2 : amount;
}

/**
 * Determine if a bet can be accepted
 * @param bet The bet to check
 * @returns True if the bet can be accepted
 */
export function canAcceptBet(bet: Bet): boolean {
  const now = new Date();
  const endDate = new Date(bet.endDate);
  
  return (
    bet.status === "open" &&
    now < endDate &&
    !!bet.contractAddress // Contract must be deployed
  );
}

/**
 * Determine if a bet can be resolved
 * @param bet The bet to check
 * @param walletAddress The address attempting to resolve
 * @returns True if the bet can be resolved
 */
export function canResolveBet(bet: Bet, walletAddress: string): boolean {
  // Can only resolve if bet is accepted and not already resolved/voided
  if (bet.status !== "accepted") {
    return false;
  }
  
  // Check if the caller is authorized to resolve
  const resolverAddress = bet.resolverAddress || bet.creatorAddress;
  return walletAddress.toLowerCase() === resolverAddress.toLowerCase();
}

/**
 * Format bet amount for display
 * @param bet The bet object
 * @returns Formatted string with ETH symbol
 */
export function formatBetAmount(bet: Bet): string {
  return `${bet.betAmount} ETH`;
}

/**
 * Calculate time remaining until bet resolution
 * @param bet The bet object
 * @returns Object with days, hours, minutes remaining
 */
export function getTimeRemaining(bet: Bet): { days: number, hours: number, minutes: number } | null {
  const now = new Date();
  const endDate = new Date(bet.endDate);
  
  if (now >= endDate) {
    return null; // Already ended
  }
  
  const totalMs = endDate.getTime() - now.getTime();
  const totalMinutes = Math.floor(totalMs / (1000 * 60));
  
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  
  return { days, hours, minutes };
}

/**
 * Format the status of a bet for display
 * @param bet The bet object
 * @returns Human-readable status string
 */
export function getStatusDisplay(bet: Bet): string {
  switch (bet.status) {
    case "open":
      return "Open for acceptance";
    case "accepted":
      return "Bet in progress";
    case "resolved":
      if (bet.outcome === "outcome1Wins") {
        return `Resolved: ${bet.outcome1} won`;
      } else if (bet.outcome === "outcome2Wins") {
        return `Resolved: ${bet.outcome2} won`;
      } else if (bet.outcome === "draw") {
        return "Resolved: Draw";
      }
      return "Resolved";
    case "voided":
      return "Bet voided";
    default:
      return bet.status;
  }
}