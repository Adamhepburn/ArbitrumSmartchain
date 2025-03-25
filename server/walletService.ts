import { ethers } from "ethers";
import crypto from "crypto";

class WalletService {
  /**
   * Create a new Ethereum wallet
   * @param password Password to encrypt the wallet
   * @returns Object containing wallet address and encrypted JSON
   */
  async createWallet(password: string): Promise<{ address: string; encryptedJson: string }> {
    try {
      // Generate a random wallet
      const wallet = ethers.Wallet.createRandom();
      
      // Encrypt the wallet with the user's password
      const encryptedJson = await wallet.encrypt(password);
      
      return {
        address: wallet.address,
        encryptedJson
      };
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw new Error("Failed to create wallet");
    }
  }
  
  /**
   * Decrypt a wallet using its encrypted JSON and password
   * @param encryptedJson Encrypted wallet JSON
   * @param password Password to decrypt the wallet
   * @returns Decrypted wallet instance
   */
  async decryptWallet(encryptedJson: string, password: string): Promise<ethers.Wallet | ethers.HDNodeWallet> {
    try {
      const wallet = await ethers.Wallet.fromEncryptedJson(encryptedJson, password);
      return wallet;
    } catch (error) {
      console.error("Error decrypting wallet:", error);
      throw new Error("Invalid password or wallet data");
    }
  }
  
  /**
   * Hash a password for secure storage
   * @param password Raw password
   * @returns Hashed password
   */
  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }
  
  /**
   * Verify a password against its hash
   * @param password Raw password
   * @param hashedPassword Hashed password from database
   * @returns True if password matches
   */
  verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }
}

export const walletService = new WalletService();