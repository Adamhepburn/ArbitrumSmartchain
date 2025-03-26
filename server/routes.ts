import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBetSchema, insertContractSchema, insertTransactionSchema, insertUserSchema } from "@shared/schema";
import { contractService } from "./contractService";
import { walletService } from "./walletService";
import { transactionService } from "./transactionService";
import { setupAuth } from "./auth";
import { z } from "zod";
import { ethers } from "ethers";
import { BetCreationRequestSchema, BetSchema } from "@shared/schemas/bet-schema";
import { createBetFromRequest } from "@shared/utils/bet-utils";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);
  
  // prefix all routes with /api
  
  // User registration - create account with generated wallet
  app.post("/api/register", async (req, res) => {
    try {
      // Extend the user schema to include password confirmation
      const registerSchema = insertUserSchema.extend({
        confirmPassword: z.string()
      }).refine(data => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
      
      const parsedBody = registerSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: parsedBody.error.errors 
        });
      }
      
      // Check if username is already taken
      const existingUser = await storage.getUserByUsername(parsedBody.data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Create a new wallet for the user
      const walletData = await walletService.createWallet(parsedBody.data.password);
      
      // Hash the password for storage
      const hashedPassword = walletService.hashPassword(parsedBody.data.password);
      
      // Create user with wallet information
      const user = await storage.createUser({
        username: parsedBody.data.username,
        password: hashedPassword,
        walletAddress: walletData.address,
        walletEncryptedJson: walletData.encryptedJson
      });
      
      // Return user data without sensitive information
      return res.status(201).json({
        id: user.id,
        username: user.username,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error("Error registering user:", error);
      return res.status(500).json({ message: "Failed to register user" });
    }
  });
  
  // User login
  app.post("/api/login", async (req, res) => {
    try {
      const loginSchema = z.object({
        username: z.string(),
        password: z.string()
      });
      
      const parsedBody = loginSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid login data", 
          errors: parsedBody.error.errors 
        });
      }
      
      // Find user by username
      const user = await storage.getUserByUsername(parsedBody.data.username);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Verify password
      const isPasswordValid = walletService.verifyPassword(
        parsedBody.data.password, 
        user.password
      );
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Return user data with wallet address
      return res.status(200).json({
        id: user.id,
        username: user.username,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error("Error logging in:", error);
      return res.status(500).json({ message: "Failed to log in" });
    }
  });
  
  // Get wallet private key (requires password verification)
  app.post("/api/wallet/decrypt", async (req, res) => {
    try {
      const decryptSchema = z.object({
        username: z.string(),
        password: z.string()
      });
      
      const parsedBody = decryptSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: parsedBody.error.errors 
        });
      }
      
      // Find user by username
      const user = await storage.getUserByUsername(parsedBody.data.username);
      if (!user || !user.walletEncryptedJson) {
        return res.status(404).json({ message: "Wallet not found" });
      }
      
      // Verify password
      const isPasswordValid = walletService.verifyPassword(
        parsedBody.data.password, 
        user.password
      );
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid password" });
      }
      
      // Decrypt wallet
      const wallet = await walletService.decryptWallet(
        user.walletEncryptedJson,
        parsedBody.data.password
      );
      
      // Return wallet information
      return res.status(200).json({
        address: wallet.address,
        privateKey: wallet.privateKey
      });
    } catch (error) {
      console.error("Error decrypting wallet:", error);
      return res.status(500).json({ message: "Failed to decrypt wallet" });
    }
  });
  
  // Get user profile by ID
  app.get("/api/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user data without sensitive information
      return res.status(200).json({
        id: user.id,
        username: user.username,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Get contracts by deployer address
  app.get("/api/contracts/:deployerAddress", async (req, res) => {
    try {
      const deployerAddress = req.params.deployerAddress;
      if (!deployerAddress || typeof deployerAddress !== "string") {
        return res.status(400).json({ message: "Invalid deployer address" });
      }

      const contracts = await storage.getContractsByDeployer(deployerAddress);
      return res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      return res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Get contract by address
  app.get("/api/contract/:contractAddress", async (req, res) => {
    try {
      const contractAddress = req.params.contractAddress;
      if (!contractAddress || typeof contractAddress !== "string") {
        return res.status(400).json({ message: "Invalid contract address" });
      }

      const contract = await storage.getContractByAddress(contractAddress);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      return res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      return res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  // Create contract
  app.post("/api/contracts", async (req, res) => {
    try {
      const parsedBody = insertContractSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid contract data", errors: parsedBody.error.errors });
      }

      const contract = await storage.createContract(parsedBody.data);
      return res.status(201).json(contract);
    } catch (error) {
      console.error("Error creating contract:", error);
      return res.status(500).json({ message: "Failed to create contract" });
    }
  });

  // Get transactions by address (from or to)
  app.get("/api/transactions/:address", async (req, res) => {
    try {
      const address = req.params.address;
      if (!address || typeof address !== "string") {
        return res.status(400).json({ message: "Invalid address" });
      }

      const transactions = await storage.getTransactionsByAddress(address);
      return res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Get transactions by contract address
  app.get("/api/contract/:contractAddress/transactions", async (req, res) => {
    try {
      const contractAddress = req.params.contractAddress;
      if (!contractAddress || typeof contractAddress !== "string") {
        return res.status(400).json({ message: "Invalid contract address" });
      }

      const transactions = await storage.getTransactionsByContract(contractAddress);
      return res.json(transactions);
    } catch (error) {
      console.error("Error fetching contract transactions:", error);
      return res.status(500).json({ message: "Failed to fetch contract transactions" });
    }
  });

  // Create transaction
  app.post("/api/transactions", async (req, res) => {
    try {
      const parsedBody = insertTransactionSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid transaction data", errors: parsedBody.error.errors });
      }

      const transaction = await storage.createTransaction(parsedBody.data);
      return res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      return res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Get transaction by hash
  app.get("/api/transaction/:hash", async (req, res) => {
    try {
      const hash = req.params.hash;
      if (!hash || typeof hash !== "string") {
        return res.status(400).json({ message: "Invalid transaction hash" });
      }

      const transaction = await storage.getTransactionByHash(hash);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      return res.json(transaction);
    } catch (error) {
      console.error("Error fetching transaction:", error);
      return res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  // Compile contract
  app.post("/api/compile", async (req, res) => {
    try {
      const compileSchema = z.object({
        contractType: z.string(),
        contractCode: z.string().optional(),
      });
      
      const parsedBody = compileSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsedBody.error.errors });
      }
      
      const { contractType, contractCode } = parsedBody.data;
      
      const compiledContract = await contractService.compileContract(contractType, contractCode);
      
      return res.json(compiledContract);
    } catch (error) {
      console.error("Error compiling contract:", error);
      return res.status(500).json({ message: "Failed to compile contract" });
    }
  });

  // Deploy a contract
  app.post("/api/deploy", async (req, res) => {
    try {
      const deploySchema = z.object({
        username: z.string(),
        password: z.string(),
        contractType: z.string(),
        constructorArgs: z.array(z.any()).optional(),
      });
      
      const parsedBody = deploySchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsedBody.error.errors });
      }
      
      const { username, password, contractType, constructorArgs } = parsedBody.data;
      
      const result = await transactionService.deployContract(
        username,
        password,
        contractType,
        constructorArgs || []
      );
      
      return res.json(result);
    } catch (error) {
      console.error("Error deploying contract:", error);
      return res.status(500).json({ message: "Failed to deploy contract" });
    }
  });
  
  // Execute a contract method
  app.post("/api/execute", async (req, res) => {
    try {
      const executeSchema = z.object({
        username: z.string(),
        password: z.string(),
        contractAddress: z.string(),
        methodName: z.string(),
        args: z.array(z.any()).optional(),
        value: z.string().optional(),
      });
      
      const parsedBody = executeSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsedBody.error.errors });
      }
      
      const { username, password, contractAddress, methodName, args, value } = parsedBody.data;
      
      const result = await transactionService.executeContractMethod(
        username,
        password,
        contractAddress,
        methodName,
        args || [],
        value || "0"
      );
      
      return res.json(result);
    } catch (error) {
      console.error("Error executing contract method:", error);
      return res.status(500).json({ message: "Failed to execute contract method" });
    }
  });
  
  // Read from a contract (no transaction)
  app.post("/api/read", async (req, res) => {
    try {
      const readSchema = z.object({
        contractAddress: z.string(),
        methodName: z.string(),
        args: z.array(z.any()).optional(),
      });
      
      const parsedBody = readSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsedBody.error.errors });
      }
      
      const { contractAddress, methodName, args } = parsedBody.data;
      
      const result = await transactionService.readContractData(
        contractAddress,
        methodName,
        args || []
      );
      
      return res.json({ result });
    } catch (error) {
      console.error("Error reading contract data:", error);
      return res.status(500).json({ message: "Failed to read contract data" });
    }
  });
  
  // Create a bet with smart contract deployment
  app.post("/api/bet", async (req, res) => {
    try {
      const betSchema = z.object({
        username: z.string(),
        password: z.string(),
        title: z.string(),
        description: z.string(),
        category: z.string(),
        outcome1: z.string(),
        outcome2: z.string(),
        endDate: z.number(),
        betAmount: z.string(),
        resolverAddress: z.string().optional(),
      });
      
      const parsedBody = betSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsedBody.error.errors });
      }
      
      const result = await transactionService.createBet(
        parsedBody.data.username,
        parsedBody.data.password,
        parsedBody.data
      );
      
      return res.json(result);
    } catch (error) {
      console.error("Error creating bet:", error);
      return res.status(500).json({ message: "Failed to create bet" });
    }
  });
  
  // Create a bet directly in the database (for testing without blockchain interaction)
  app.post("/api/bet/test", async (req, res) => {
    try {
      // Validate basic bet data
      const testBetSchema = z.object({
        username: z.string(),  // Creator's username
        title: z.string(),
        description: z.string(),
        category: z.string(),
        outcome1: z.string(),
        outcome2: z.string(),
        endDate: z.number().or(z.date()),
        betAmount: z.string(),
        resolverAddress: z.string().optional()
      });
      
      const parsedBody = testBetSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid bet data", 
          errors: parsedBody.error.errors 
        });
      }
      
      // Get user info to validate the creator's wallet address
      const user = await storage.getUserByUsername(parsedBody.data.username);
      if (!user || !user.walletAddress) {
        return res.status(404).json({ message: "User or user wallet not found" });
      }
      
      // Create bet object with the creator's actual wallet address
      const betData = {
        title: parsedBody.data.title,
        description: parsedBody.data.description,
        category: parsedBody.data.category,
        outcome1: parsedBody.data.outcome1,
        outcome2: parsedBody.data.outcome2,
        endDate: parsedBody.data.endDate instanceof Date 
          ? parsedBody.data.endDate 
          : new Date(parsedBody.data.endDate),
        betAmount: parsedBody.data.betAmount,
        creatorAddress: user.walletAddress,
        resolverAddress: parsedBody.data.resolverAddress || user.walletAddress
      };
      
      // Use insertBetSchema from shared/schema for validation against database schema
      const insertData = insertBetSchema.parse(betData);
      
      // Save to database
      const newBet = await storage.createBet(insertData);
      
      return res.status(201).json(newBet);
    } catch (error) {
      console.error("Error creating test bet:", error);
      return res.status(500).json({ message: "Failed to create test bet" });
    }
  });
  
  // Get all bets
  app.get("/api/bets", async (req, res) => {
    try {
      // Filter by status if provided in query
      const status = req.query.status as string | undefined;
      
      let bets;
      if (status) {
        bets = await storage.getBetsByStatus(status);
      } else {
        // Get open bets by default
        bets = await storage.getBetsByStatus("open");
      }
      
      return res.json(bets);
    } catch (error) {
      console.error("Error fetching bets:", error);
      return res.status(500).json({ message: "Failed to fetch bets" });
    }
  });
  
  // Get bet by ID
  app.get("/api/bet/:betId", async (req, res) => {
    try {
      const betId = parseInt(req.params.betId);
      if (isNaN(betId)) {
        return res.status(400).json({ message: "Invalid bet ID" });
      }
      
      const bet = await storage.getBet(betId);
      if (!bet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      return res.json(bet);
    } catch (error) {
      console.error("Error fetching bet:", error);
      return res.status(500).json({ message: "Failed to fetch bet" });
    }
  });
  
  // Get bet by contract address
  app.get("/api/bet/contract/:contractAddress", async (req, res) => {
    try {
      const contractAddress = req.params.contractAddress;
      if (!contractAddress || typeof contractAddress !== "string") {
        return res.status(400).json({ message: "Invalid contract address" });
      }
      
      const bet = await storage.getBetByContractAddress(contractAddress);
      if (!bet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      return res.json(bet);
    } catch (error) {
      console.error("Error fetching bet by contract:", error);
      return res.status(500).json({ message: "Failed to fetch bet" });
    }
  });
  
  // Get bets by creator address
  app.get("/api/bets/creator/:creatorAddress", async (req, res) => {
    try {
      const creatorAddress = req.params.creatorAddress;
      if (!creatorAddress || typeof creatorAddress !== "string") {
        return res.status(400).json({ message: "Invalid creator address" });
      }
      
      const bets = await storage.getBetsByCreator(creatorAddress);
      return res.json(bets);
    } catch (error) {
      console.error("Error fetching bets by creator:", error);
      return res.status(500).json({ message: "Failed to fetch bets" });
    }
  });
  
  // Get bets by acceptor address
  app.get("/api/bets/acceptor/:acceptorAddress", async (req, res) => {
    try {
      const acceptorAddress = req.params.acceptorAddress;
      if (!acceptorAddress || typeof acceptorAddress !== "string") {
        return res.status(400).json({ message: "Invalid acceptor address" });
      }
      
      const bets = await storage.getBetsByAcceptor(acceptorAddress);
      return res.json(bets);
    } catch (error) {
      console.error("Error fetching bets by acceptor:", error);
      return res.status(500).json({ message: "Failed to fetch bets" });
    }
  });
  
  // Update a bet (e.g., to set contract address, acceptor, or change status)
  app.patch("/api/bet/:betId", async (req, res) => {
    try {
      const betId = parseInt(req.params.betId);
      if (isNaN(betId)) {
        return res.status(400).json({ message: "Invalid bet ID" });
      }
      
      // Get the existing bet
      const existingBet = await storage.getBet(betId);
      if (!existingBet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      // Validate update payload
      const updateSchema = z.object({
        status: z.enum(["open", "accepted", "resolved", "voided"]).optional(),
        outcome: z.enum(["notResolved", "outcome1Wins", "outcome2Wins", "draw"]).optional(),
        acceptorAddress: z.string().nullable().optional(),
        contractAddress: z.string().nullable().optional(),
        transactionHash: z.string().nullable().optional(),
      });
      
      const parsedBody = updateSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid update data", 
          errors: parsedBody.error.errors 
        });
      }
      
      // Apply updates
      const updatedBet = await storage.updateBet(betId, parsedBody.data);
      
      return res.json(updatedBet);
    } catch (error) {
      console.error("Error updating bet:", error);
      return res.status(500).json({ message: "Failed to update bet" });
    }
  });
  
  // Accept a bet
  app.post("/api/bet/:betId/accept", async (req, res) => {
    try {
      const betId = parseInt(req.params.betId);
      if (isNaN(betId)) {
        return res.status(400).json({ message: "Invalid bet ID" });
      }
      
      // Get the existing bet
      const bet = await storage.getBet(betId);
      if (!bet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      // Check if bet is already accepted
      if (bet.status !== "open") {
        return res.status(400).json({ 
          message: "Bet cannot be accepted", 
          reason: `Bet is already in ${bet.status} status` 
        });
      }
      
      // Validate request
      const acceptSchema = z.object({
        username: z.string(),
        password: z.string(),
        acceptorAddress: z.string()
      });
      
      const parsedBody = acceptSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: parsedBody.error.errors 
        });
      }
      
      // Use transactionService to accept the bet (this would handle the smart contract interaction)
      // This is a placeholder for the actual implementation
      const result = await transactionService.executeContractMethod(
        parsedBody.data.username,
        parsedBody.data.password,
        bet.contractAddress || "",
        "acceptBet",
        [],
        bet.betAmount // The value to send with the transaction (bet amount)
      );
      
      // Update bet status and acceptor
      const updatedBet = await storage.updateBet(betId, {
        status: "accepted",
        acceptorAddress: parsedBody.data.acceptorAddress,
        transactionHash: result.transactionHash || result.hash
      });
      
      return res.json(updatedBet);
    } catch (error) {
      console.error("Error accepting bet:", error);
      return res.status(500).json({ message: "Failed to accept bet" });
    }
  });
  
  // Accept a bet (test version without blockchain interaction)
  app.post("/api/bet/:betId/accept/test", async (req, res) => {
    try {
      const betId = parseInt(req.params.betId);
      if (isNaN(betId)) {
        return res.status(400).json({ message: "Invalid bet ID" });
      }
      
      // Get the existing bet
      const bet = await storage.getBet(betId);
      if (!bet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      // Check if bet is already accepted
      if (bet.status !== "open") {
        return res.status(400).json({ 
          message: "Bet cannot be accepted", 
          reason: `Bet is already in ${bet.status} status` 
        });
      }
      
      // Validate request
      const acceptSchema = z.object({
        username: z.string(),  // Username of acceptor
      });
      
      const parsedBody = acceptSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: parsedBody.error.errors 
        });
      }
      
      // Get acceptor's wallet address
      const user = await storage.getUserByUsername(parsedBody.data.username);
      if (!user || !user.walletAddress) {
        return res.status(404).json({ message: "User or user wallet not found" });
      }
      
      // Update bet status and acceptor - no blockchain interaction in test mode
      const updatedBet = await storage.updateBet(betId, {
        status: "accepted",
        acceptorAddress: user.walletAddress,
        // For test purposes, we'll use a mock transaction hash
        transactionHash: `test_acceptance_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      });
      
      return res.json(updatedBet);
    } catch (error) {
      console.error("Error accepting test bet:", error);
      return res.status(500).json({ message: "Failed to accept test bet" });
    }
  });
  
  // Resolve a bet
  app.post("/api/bet/:betId/resolve", async (req, res) => {
    try {
      const betId = parseInt(req.params.betId);
      if (isNaN(betId)) {
        return res.status(400).json({ message: "Invalid bet ID" });
      }
      
      // Get the existing bet
      const bet = await storage.getBet(betId);
      if (!bet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      // Check if bet can be resolved
      if (bet.status !== "accepted") {
        return res.status(400).json({ 
          message: "Bet cannot be resolved", 
          reason: `Bet must be in 'accepted' status, current status: ${bet.status}` 
        });
      }
      
      // Validate request
      const resolveSchema = z.object({
        username: z.string(),
        password: z.string(),
        outcome: z.enum(["outcome1Wins", "outcome2Wins", "draw"]),
        resolverAddress: z.string()
      });
      
      const parsedBody = resolveSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: parsedBody.error.errors 
        });
      }
      
      // Check if resolver is authorized
      if (bet.resolverAddress && 
          bet.resolverAddress.toLowerCase() !== parsedBody.data.resolverAddress.toLowerCase()) {
        return res.status(403).json({ 
          message: "Unauthorized resolver", 
          reason: "Only the designated resolver can resolve this bet" 
        });
      }
      
      // Use transactionService to resolve the bet (this would handle the smart contract interaction)
      const outcomeValue = 
        parsedBody.data.outcome === "outcome1Wins" ? 1 :
        parsedBody.data.outcome === "outcome2Wins" ? 2 : 
        3; // draw
      
      const result = await transactionService.executeContractMethod(
        parsedBody.data.username,
        parsedBody.data.password,
        bet.contractAddress || "",
        "resolveBet",
        [outcomeValue],
        "0"
      );
      
      // Update bet status and outcome
      const updatedBet = await storage.updateBet(betId, {
        status: "resolved",
        outcome: parsedBody.data.outcome,
        transactionHash: result.transactionHash || result.hash
      });
      
      return res.json(updatedBet);
    } catch (error) {
      console.error("Error resolving bet:", error);
      return res.status(500).json({ message: "Failed to resolve bet" });
    }
  });
  
  // Resolve a bet (test version without blockchain interaction)
  app.post("/api/bet/:betId/resolve/test", async (req, res) => {
    try {
      const betId = parseInt(req.params.betId);
      if (isNaN(betId)) {
        return res.status(400).json({ message: "Invalid bet ID" });
      }
      
      // Get the existing bet
      const bet = await storage.getBet(betId);
      if (!bet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      
      // Check if bet can be resolved
      if (bet.status !== "accepted") {
        return res.status(400).json({ 
          message: "Bet cannot be resolved", 
          reason: `Bet must be in 'accepted' status, current status: ${bet.status}` 
        });
      }
      
      // Validate request
      const resolveSchema = z.object({
        username: z.string(),  // Username of resolver
        outcome: z.enum(["outcome1Wins", "outcome2Wins", "draw"])
      });
      
      const parsedBody = resolveSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: parsedBody.error.errors 
        });
      }
      
      // Get resolver's wallet address
      const user = await storage.getUserByUsername(parsedBody.data.username);
      if (!user || !user.walletAddress) {
        return res.status(404).json({ message: "User or user wallet not found" });
      }
      
      // Check if resolver is authorized
      if (bet.resolverAddress && 
          bet.resolverAddress.toLowerCase() !== user.walletAddress.toLowerCase()) {
        return res.status(403).json({ 
          message: "Unauthorized resolver", 
          reason: "Only the designated resolver can resolve this bet" 
        });
      }
      
      // Update bet status and outcome - no blockchain interaction in test mode
      const updatedBet = await storage.updateBet(betId, {
        status: "resolved",
        outcome: parsedBody.data.outcome,
        // For test purposes, we'll use a mock transaction hash
        transactionHash: `test_resolution_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      });
      
      return res.json(updatedBet);
    } catch (error) {
      console.error("Error resolving test bet:", error);
      return res.status(500).json({ message: "Failed to resolve test bet" });
    }
  });
  
  // Get wallet balance
  app.get("/api/balance/:address", async (req, res) => {
    try {
      const address = req.params.address;
      if (!address || typeof address !== "string") {
        return res.status(400).json({ message: "Invalid address" });
      }
      
      const balance = await transactionService.getBalance(address);
      return res.json({ balance });
    } catch (error) {
      console.error("Error getting balance:", error);
      return res.status(500).json({ message: "Failed to get balance" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
