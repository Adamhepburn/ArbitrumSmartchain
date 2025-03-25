import { ethers } from "ethers";
import { walletService } from "./walletService";
import { contractService } from "./contractService";
import { storage } from "./storage";
import { InsertTransaction } from "@shared/schema";

// Configure provider based on environment
const RPC_URL = process.env.RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const CHAIN_ID = 421614; // Arbitrum Sepolia

class TransactionService {
  private provider: ethers.JsonRpcProvider;
  
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  
  /**
   * Sign and broadcast a transaction using a user's wallet
   * @param username Username of the wallet owner
   * @param password Password to decrypt the wallet
   * @param txData Transaction data to sign and send
   */
  async signAndSendTransaction(
    username: string, 
    password: string, 
    txData: ethers.TransactionRequest
  ): Promise<ethers.TransactionResponse> {
    try {
      // Get user from database
      const user = await storage.getUserByUsername(username);
      if (!user || !user.walletEncryptedJson) {
        throw new Error("User or wallet not found");
      }
      
      // Decrypt wallet
      const wallet = await walletService.decryptWallet(
        user.walletEncryptedJson,
        password
      );
      
      // Connect wallet to provider
      const connectedWallet = wallet.connect(this.provider);
      
      // If no gas price is set, estimate it
      if (!txData.gasPrice && !txData.maxFeePerGas) {
        const feeData = await this.provider.getFeeData();
        txData.maxFeePerGas = feeData.maxFeePerGas;
        txData.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      }
      
      // Send transaction
      const tx = await connectedWallet.sendTransaction(txData);
      
      return tx;
    } catch (error) {
      console.error("Error signing and sending transaction:", error);
      throw error;
    }
  }
  
  /**
   * Deploy a contract using user's wallet
   * @param username Username of the wallet owner
   * @param password Password to decrypt the wallet
   * @param contractType Type of contract to deploy
   * @param constructorArgs Arguments for the contract constructor
   */
  async deployContract(
    username: string,
    password: string,
    contractType: string,
    constructorArgs: any[] = []
  ): Promise<{ address: string; transactionHash: string }> {
    try {
      // Get user from database
      const user = await storage.getUserByUsername(username);
      if (!user || !user.walletEncryptedJson) {
        throw new Error("User or wallet not found");
      }
      
      // Get compiled contract
      const compiledContract = await contractService.compileContract(contractType);
      
      // Decrypt wallet
      const wallet = await walletService.decryptWallet(
        user.walletEncryptedJson,
        password
      );
      
      // Connect wallet to provider
      const connectedWallet = wallet.connect(this.provider);
      
      // Create contract factory
      const factory = new ethers.ContractFactory(
        compiledContract.abi,
        compiledContract.bytecode,
        connectedWallet
      );
      
      // Deploy contract
      const contract = await factory.deploy(...constructorArgs);
      
      // Wait for deployment to complete
      await contract.deploymentTransaction()?.wait();
      
      // Store contract in database
      const deployTx = contract.deploymentTransaction();
      if (!deployTx) {
        throw new Error("Deployment transaction not found");
      }
      
      const contractData = {
        name: contractType,
        address: contract.target as string,
        contractType: contractType,
        abi: compiledContract.abi,
        bytecode: compiledContract.bytecode,
        deployedByAddress: user.walletAddress!,
        network: "Arbitrum Sepolia",
      };
      
      await storage.createContract(contractData);
      
      // Create transaction record
      const txData: InsertTransaction = {
        hash: deployTx.hash,
        from: user.walletAddress!,
        to: null,
        contractAddress: contract.target as string,
        value: deployTx.value?.toString() || "0",
        gasUsed: "0", // Will be updated when tx is mined
        gasPrice: deployTx.gasPrice?.toString() || "0",
        status: "pending",
        type: "deploy",
        method: "constructor",
        args: constructorArgs,
        blockNumber: null,
        network: "Arbitrum Sepolia",
      };
      
      await storage.createTransaction(txData);
      
      return {
        address: contract.target as string,
        transactionHash: deployTx.hash,
      };
    } catch (error) {
      console.error("Error deploying contract:", error);
      throw error;
    }
  }
  
  /**
   * Execute a method on a contract
   * @param username Username of the wallet owner
   * @param password Password to decrypt the wallet
   * @param contractAddress Address of the contract
   * @param methodName Name of the method to call
   * @param args Arguments for the method
   * @param value ETH value to send with the transaction
   */
  async executeContractMethod(
    username: string,
    password: string,
    contractAddress: string,
    methodName: string,
    args: any[] = [],
    value: string = "0"
  ): Promise<{ transactionHash: string }> {
    try {
      // Get user from database
      const user = await storage.getUserByUsername(username);
      if (!user || !user.walletEncryptedJson) {
        throw new Error("User or wallet not found");
      }
      
      // Get contract from database
      const contract = await storage.getContractByAddress(contractAddress);
      if (!contract) {
        throw new Error("Contract not found");
      }
      
      // Decrypt wallet
      const wallet = await walletService.decryptWallet(
        user.walletEncryptedJson,
        password
      );
      
      // Connect wallet to provider
      const connectedWallet = wallet.connect(this.provider);
      
      // Create contract instance
      const contractInstance = new ethers.Contract(
        contractAddress,
        contract.abi as ethers.InterfaceAbi,
        connectedWallet
      );
      
      // Execute method
      const tx = await contractInstance[methodName](...args, {
        value: ethers.parseEther(value),
      });
      
      // Create transaction record
      const txData: InsertTransaction = {
        hash: tx.hash,
        from: user.walletAddress!,
        to: contractAddress,
        contractAddress: contractAddress,
        value: value,
        gasUsed: "0", // Will be updated when tx is mined
        gasPrice: tx.gasPrice?.toString() || "0",
        status: "pending",
        type: "call",
        method: methodName,
        args: args,
        blockNumber: null,
        network: "Arbitrum Sepolia",
      };
      
      await storage.createTransaction(txData);
      
      return {
        transactionHash: tx.hash,
      };
    } catch (error) {
      console.error("Error executing contract method:", error);
      throw error;
    }
  }
  
  /**
   * Read data from a contract (no transaction needed)
   * @param contractAddress Address of the contract
   * @param methodName Name of the method to call
   * @param args Arguments for the method
   */
  async readContractData(
    contractAddress: string,
    methodName: string,
    args: any[] = []
  ): Promise<any> {
    try {
      // Get contract from database
      const contract = await storage.getContractByAddress(contractAddress);
      if (!contract) {
        throw new Error("Contract not found");
      }
      
      // Create contract instance
      const contractInstance = new ethers.Contract(
        contractAddress,
        contract.abi as ethers.InterfaceAbi,
        this.provider
      );
      
      // Call method
      const result = await contractInstance[methodName](...args);
      
      return result;
    } catch (error) {
      console.error("Error reading contract data:", error);
      throw error;
    }
  }
  
  /**
   * Get balance of an address
   * @param address Ethereum address
   */
  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Error getting balance:", error);
      throw error;
    }
  }
  
  /**
   * Create and deploy a betting contract
   * @param username Username of the wallet owner
   * @param password Password to decrypt the wallet
   * @param betData Bet details
   */
  async createBet(
    username: string,
    password: string,
    betData: {
      title: string;
      description: string;
      category: string;
      outcome1: string;
      outcome2: string;
      endDate: number;
      betAmount: string;
      resolverAddress?: string;
    }
  ): Promise<{ address: string; transactionHash: string }> {
    try {
      // Deploy a betting contract
      return await this.deployContract(
        username,
        password,
        "Betting Contract",
        [
          betData.title,
          betData.description,
          betData.category,
          betData.outcome1,
          betData.outcome2,
          betData.endDate,
          ethers.parseEther(betData.betAmount),
          betData.resolverAddress || ethers.ZeroAddress, // Use resolver if provided, otherwise Zero Address
        ]
      );
    } catch (error) {
      console.error("Error creating bet:", error);
      throw error;
    }
  }
}

export const transactionService = new TransactionService();