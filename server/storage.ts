import { 
  users, type User, type InsertUser,
  contracts, type Contract, type InsertContract,
  transactions, type Transaction, type InsertTransaction
} from "@shared/schema";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
const { Pool } = pg;

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
  
  // Session store for authentication
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private contracts: Map<number, Contract>;
  private transactions: Map<number, Transaction>;
  
  userCurrentId: number;
  contractCurrentId: number;
  transactionCurrentId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.contracts = new Map();
    this.transactions = new Map();
    
    this.userCurrentId = 1;
    this.contractCurrentId = 1;
    this.transactionCurrentId = 1;
    
    // Create memory-based session store
    const MemoryStore = require('memorystore')(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
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

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  private pool: ReturnType<typeof Pool>;
  
  constructor() {
    // Create PostgreSQL pool
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Create session store
    const PgStore = connectPgSimple(session);
    this.sessionStore = new PgStore({
      pool: this.pool,
      createTableIfMissing: true
    });
    
    // Initialize database tables
    this.initDatabase();
  }
  
  private async initDatabase() {
    try {
      // Create tables if they don't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          wallet_address TEXT UNIQUE,
          wallet_encrypted_json TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS contracts (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT UNIQUE NOT NULL,
          contract_type TEXT NOT NULL,
          abi JSONB NOT NULL,
          bytecode TEXT NOT NULL,
          deployed_by_address TEXT NOT NULL,
          deployed_at_block INTEGER,
          network TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          hash TEXT UNIQUE NOT NULL,
          from_address TEXT NOT NULL,
          to_address TEXT,
          contract_address TEXT,
          value TEXT,
          gas_used TEXT,
          gas_price TEXT,
          status TEXT NOT NULL,
          type TEXT NOT NULL,
          method TEXT,
          args JSONB,
          block_number INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          network TEXT NOT NULL
        );
      `);
      
      console.log('Database tables initialized');
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }
  
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return this.mapUserFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return undefined;
    }
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return this.mapUserFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return undefined;
    }
  }
  
  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE wallet_address = $1',
        [walletAddress]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return this.mapUserFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error fetching user by wallet address:', error);
      return undefined;
    }
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const result = await this.pool.query(
        `INSERT INTO users (username, password, wallet_address, wallet_encrypted_json)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          insertUser.username,
          insertUser.password,
          insertUser.walletAddress || null,
          insertUser.walletEncryptedJson || null
        ]
      );
      
      return this.mapUserFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
  
  async createContract(insertContract: InsertContract): Promise<Contract> {
    try {
      const result = await this.pool.query(
        `INSERT INTO contracts (name, address, contract_type, abi, bytecode, deployed_by_address, deployed_at_block, network)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          insertContract.name,
          insertContract.address,
          insertContract.contractType,
          JSON.stringify(insertContract.abi),
          insertContract.bytecode,
          insertContract.deployedByAddress,
          insertContract.deployedAtBlock || null,
          insertContract.network
        ]
      );
      
      return this.mapContractFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error creating contract:', error);
      throw error;
    }
  }
  
  async getContract(id: number): Promise<Contract | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM contracts WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return this.mapContractFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error fetching contract by ID:', error);
      return undefined;
    }
  }
  
  async getContractByAddress(address: string): Promise<Contract | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM contracts WHERE LOWER(address) = LOWER($1)',
        [address]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return this.mapContractFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error fetching contract by address:', error);
      return undefined;
    }
  }
  
  async getContractsByDeployer(deployerAddress: string): Promise<Contract[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM contracts WHERE LOWER(deployed_by_address) = LOWER($1) ORDER BY created_at DESC',
        [deployerAddress]
      );
      
      return result.rows.map(row => this.mapContractFromDb(row));
    } catch (error) {
      console.error('Error fetching contracts by deployer:', error);
      return [];
    }
  }
  
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    try {
      const result = await this.pool.query(
        `INSERT INTO transactions 
         (hash, from_address, to_address, contract_address, value, gas_used, gas_price, status, type, method, args, block_number, network)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          insertTransaction.hash,
          insertTransaction.from,
          insertTransaction.to || null,
          insertTransaction.contractAddress || null,
          insertTransaction.value || null,
          insertTransaction.gasUsed || null,
          insertTransaction.gasPrice || null,
          insertTransaction.status,
          insertTransaction.type,
          insertTransaction.method || null,
          insertTransaction.args ? JSON.stringify(insertTransaction.args) : null,
          insertTransaction.blockNumber || null,
          insertTransaction.network
        ]
      );
      
      return this.mapTransactionFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM transactions WHERE id = $1',
        [id]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return this.mapTransactionFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error fetching transaction by ID:', error);
      return undefined;
    }
  }
  
  async getTransactionByHash(hash: string): Promise<Transaction | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM transactions WHERE LOWER(hash) = LOWER($1)',
        [hash]
      );
      
      if (result.rows.length === 0) {
        return undefined;
      }
      
      return this.mapTransactionFromDb(result.rows[0]);
    } catch (error) {
      console.error('Error fetching transaction by hash:', error);
      return undefined;
    }
  }
  
  async getTransactionsByAddress(address: string): Promise<Transaction[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM transactions WHERE LOWER(from_address) = LOWER($1) OR LOWER(to_address) = LOWER($1) ORDER BY created_at DESC',
        [address]
      );
      
      return result.rows.map(row => this.mapTransactionFromDb(row));
    } catch (error) {
      console.error('Error fetching transactions by address:', error);
      return [];
    }
  }
  
  async getTransactionsByContract(contractAddress: string): Promise<Transaction[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM transactions WHERE LOWER(contract_address) = LOWER($1) ORDER BY created_at DESC',
        [contractAddress]
      );
      
      return result.rows.map(row => this.mapTransactionFromDb(row));
    } catch (error) {
      console.error('Error fetching transactions by contract:', error);
      return [];
    }
  }
  
  // Helper methods to map database rows to typed objects
  private mapUserFromDb(row: Record<string, any>): User {
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      walletAddress: row.wallet_address,
      walletEncryptedJson: row.wallet_encrypted_json,
      createdAt: new Date(row.created_at)
    };
  }
  
  private mapContractFromDb(row: Record<string, any>): Contract {
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      contractType: row.contract_type,
      abi: typeof row.abi === 'string' ? JSON.parse(row.abi) : row.abi,
      bytecode: row.bytecode,
      deployedByAddress: row.deployed_by_address,
      deployedAtBlock: row.deployed_at_block,
      network: row.network,
      createdAt: new Date(row.created_at)
    };
  }
  
  private mapTransactionFromDb(row: Record<string, any>): Transaction {
    return {
      id: row.id,
      hash: row.hash,
      from: row.from_address,
      to: row.to_address,
      contractAddress: row.contract_address,
      value: row.value,
      gasUsed: row.gas_used,
      gasPrice: row.gas_price,
      status: row.status,
      type: row.type,
      method: row.method,
      args: row.args ? (typeof row.args === 'string' ? JSON.parse(row.args) : row.args) : null,
      blockNumber: row.block_number,
      network: row.network,
      createdAt: new Date(row.created_at)
    };
  }
}

// Switch to use the database storage
export const storage = new DatabaseStorage();
