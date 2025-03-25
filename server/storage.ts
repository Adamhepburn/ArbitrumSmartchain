import { 
  users, type User, type InsertUser,
  contracts, type Contract, type InsertContract,
  transactions, type Transaction, type InsertTransaction
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Contract related methods
  createContract(contract: InsertContract): Promise<Contract>;
  getContract(id: number): Promise<Contract | undefined>;
  getContractByAddress(address: string): Promise<Contract | undefined>;
  getContractsByDeployer(deployerAddress: string): Promise<Contract[]>;
  
  // Transaction related methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionByHash(hash: string): Promise<Transaction | undefined>;
  getTransactionsByAddress(address: string): Promise<Transaction[]>;
  getTransactionsByContract(contractAddress: string): Promise<Transaction[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contracts: Map<number, Contract>;
  private transactions: Map<number, Transaction>;
  
  userCurrentId: number;
  contractCurrentId: number;
  transactionCurrentId: number;

  constructor() {
    this.users = new Map();
    this.contracts = new Map();
    this.transactions = new Map();
    
    this.userCurrentId = 1;
    this.contractCurrentId = 1;
    this.transactionCurrentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now 
    };
    this.users.set(id, user);
    return user;
  }
  
  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.walletAddress === walletAddress,
    );
  }
  
  // Contract related methods
  async createContract(insertContract: InsertContract): Promise<Contract> {
    const id = this.contractCurrentId++;
    const now = new Date();
    const contract: Contract = { 
      ...insertContract, 
      id,
      createdAt: now
    };
    this.contracts.set(id, contract);
    return contract;
  }
  
  async getContract(id: number): Promise<Contract | undefined> {
    return this.contracts.get(id);
  }
  
  async getContractByAddress(address: string): Promise<Contract | undefined> {
    return Array.from(this.contracts.values()).find(
      (contract) => contract.address.toLowerCase() === address.toLowerCase()
    );
  }
  
  async getContractsByDeployer(deployerAddress: string): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(
      (contract) => contract.deployedByAddress.toLowerCase() === deployerAddress.toLowerCase()
    );
  }
  
  // Transaction related methods
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionCurrentId++;
    const now = new Date();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      createdAt: now
    };
    this.transactions.set(id, transaction);
    return transaction;
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async getTransactionByHash(hash: string): Promise<Transaction | undefined> {
    return Array.from(this.transactions.values()).find(
      (transaction) => transaction.hash.toLowerCase() === hash.toLowerCase()
    );
  }
  
  async getTransactionsByAddress(address: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => 
        transaction.from.toLowerCase() === address.toLowerCase() ||
        (transaction.to && transaction.to.toLowerCase() === address.toLowerCase())
      )
      .sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
  }
  
  async getTransactionsByContract(contractAddress: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => 
        transaction.contractAddress && 
        transaction.contractAddress.toLowerCase() === contractAddress.toLowerCase()
      )
      .sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
  }
}

export const storage = new MemStorage();
