import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContractSchema, insertTransactionSchema, insertUserSchema } from "@shared/schema";
import { contractService } from "./contractService";
import { walletService } from "./walletService";
import { transactionService } from "./transactionService";
import { z } from "zod";
import { ethers } from "ethers";

export async function registerRoutes(app: Express): Promise<Server> {
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
  
  // Create a bet
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
