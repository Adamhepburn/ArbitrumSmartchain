import { pgTable, text, serial, integer, boolean, jsonb, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { BetCategory, BetStatus, BetOutcome } from "./schemas/bet-schema";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  walletAddress: text("wallet_address"),
  walletEncryptedJson: text("wallet_encrypted_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  walletAddress: true,
  walletEncryptedJson: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Smart contract data model
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  contractType: text("contract_type").notNull(),
  abi: jsonb("abi").notNull(),
  bytecode: text("bytecode").notNull(),
  deployedByAddress: text("deployed_by_address").notNull(),
  deployedAtBlock: integer("deployed_at_block"),
  network: text("network").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// Transaction data model
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  hash: text("hash").notNull().unique(),
  from: text("from").notNull(),
  to: text("to"),
  contractAddress: text("contract_address"),
  value: text("value"),
  gasUsed: text("gas_used"),
  gasPrice: text("gas_price"),
  status: text("status").notNull(),
  type: text("type").notNull(), // 'deploy', 'call', 'transfer'
  method: text("method"),
  args: jsonb("args"),
  blockNumber: integer("block_number"),
  network: text("network").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// Bet data model
export const bets = pgTable("bets", {
  id: serial("id").primaryKey(),
  
  // Basic Bet Information
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().$type<BetCategory>(),
  
  // Outcomes
  outcome1: text("outcome1").notNull(),
  outcome2: text("outcome2").notNull(),
  
  // Time and Amount Details
  endDate: timestamp("end_date").notNull(),
  betAmount: text("bet_amount").notNull(),
  
  // Participant Details
  creatorAddress: text("creator_address").notNull(),
  acceptorAddress: text("acceptor_address"),
  resolverAddress: text("resolver_address"),
  
  // Contract Details
  contractAddress: text("contract_address"),
  transactionHash: text("transaction_hash"),
  
  // Status Information
  status: text("status").notNull().$type<BetStatus>().default("open"),
  outcome: text("outcome").notNull().$type<BetOutcome>().default("notResolved"),
  network: text("network").notNull().default("Arbitrum Sepolia"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBetSchema = createInsertSchema(bets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  acceptorAddress: true,
  contractAddress: true,
  transactionHash: true,
  status: true,
  outcome: true,
  network: true
});

export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof bets.$inferSelect;
