import { z } from "zod";

// ==========================================
// Bet Schema using Zod for validation
// ==========================================

// Enum values
export const BetCategory = z.enum([
  "sports", 
  "politics", 
  "entertainment", 
  "crypto", 
  "finance", 
  "other"
]);
export type BetCategory = z.infer<typeof BetCategory>;

export const BetStatus = z.enum([
  "open", 
  "accepted", 
  "resolved", 
  "voided"
]);
export type BetStatus = z.infer<typeof BetStatus>;

export const BetOutcome = z.enum([
  "notResolved", 
  "outcome1Wins", 
  "outcome2Wins", 
  "draw"
]);
export type BetOutcome = z.infer<typeof BetOutcome>;

// Ethereum address regex pattern
const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const transactionHashRegex = /^0x[a-fA-F0-9]{64}$/;

// Creation request schema (inputs needed for creating a bet)
export const BetCreationRequestSchema = z.object({
  // Basic Bet Information
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(1000),
  category: BetCategory,
  
  // Outcomes
  outcome1: z.string().min(2).max(100),
  outcome2: z.string().min(2).max(100),
  
  // Time and Amount Details
  endDate: z.coerce.date(),
  betAmount: z.string().regex(/^(0|[1-9]\d*)(\.\d+)?$/),
  
  // Optional resolver
  resolverAddress: z.string().regex(ethereumAddressRegex).nullable().optional(),
});

export type BetCreationRequest = z.infer<typeof BetCreationRequestSchema>;

// Full bet schema (including fields added during creation)
export const BetSchema = BetCreationRequestSchema.extend({
  // Identifiers
  id: z.string().uuid().optional(),
  createdAt: z.date().optional(),
  
  // Participants
  creatorAddress: z.string().regex(ethereumAddressRegex),
  acceptorAddress: z.string().regex(ethereumAddressRegex).nullable().optional(),
  
  // Contract information
  contractAddress: z.string().regex(ethereumAddressRegex).optional(),
  transactionHash: z.string().regex(transactionHashRegex).optional(),
  
  // Status information
  status: BetStatus.default("open"),
  outcome: BetOutcome.default("notResolved"),
  network: z.string().default("Arbitrum Sepolia"),
});

export type Bet = z.infer<typeof BetSchema>;

// List of bets
export const BetListSchema = z.array(BetSchema);
export type BetList = z.infer<typeof BetListSchema>;

// Helper functions for validation
export const validateBetCreationRequest = (data: unknown): BetCreationRequest => {
  return BetCreationRequestSchema.parse(data);
};

export const validateBet = (data: unknown): Bet => {
  return BetSchema.parse(data);
};