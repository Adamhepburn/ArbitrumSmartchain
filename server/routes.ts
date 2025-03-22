import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContractSchema, insertTransactionSchema } from "@shared/schema";
import { contractService } from "./contractService";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // prefix all routes with /api
  
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

  const httpServer = createServer(app);

  return httpServer;
}
