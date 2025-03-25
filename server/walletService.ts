import { ethers } from "ethers";
import { randomBytes, scryptSync, createCipheriv, createDecipheriv, createHash } from "crypto";

class WalletService {
  /**
   * Create a new Ethereum wallet
   * @param password Password to encrypt the wallet
   * @returns Object containing wallet address and encrypted JSON
   */
  async createWallet(password: string): Promise<{ address: string; encryptedJson: string }> {
    try {
      // Generate a new random wallet
      const wallet = ethers.Wallet.createRandom();
      
      // Encrypt the wallet with the password
      const encryptedJson = await this.encryptWallet(wallet, password);
      
      return {
        address: wallet.address,
        encryptedJson
      };
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw error;
    }
  }
  
  /**
   * Encrypt an Ethereum wallet
   * @param wallet Wallet instance
   * @param password Password to encrypt the wallet
   * @returns Encrypted JSON string
   */
  private async encryptWallet(wallet: ethers.Wallet, password: string): Promise<string> {
    try {
      const encryptedWallet = await wallet.encrypt(password);
      return encryptedWallet;
    } catch (error) {
      console.error("Error encrypting wallet:", error);
      throw error;
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
      throw new Error("Invalid password or corrupted wallet data");
    }
  }
  
  /**
   * Hash a password for secure storage
   * @param password Raw password
   * @returns Hashed password
   */
  hashPassword(password: string): string {
    // Generate a random salt
    const salt = randomBytes(16).toString('hex');
    
    // Hash the password with the salt using scrypt
    const hash = scryptSync(password, salt, 64).toString('hex');
    
    // Return the salt and hash joined by a colon
    return `${salt}:${hash}`;
  }
  
  /**
   * Verify a password against its hash
   * @param password Raw password
   * @param hashedPassword Hashed password from database
   * @returns True if password matches
   */
  verifyPassword(password: string, hashedPassword: string): boolean {
    // Extract the salt and hash from the stored password
    const [salt, storedHash] = hashedPassword.split(':');
    
    // Hash the provided password with the same salt
    const hash = scryptSync(password, salt, 64).toString('hex');
    
    // Compare the new hash with the stored hash
    return storedHash === hash;
  }
}

export const walletService = new WalletService();