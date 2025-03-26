import { ethers } from "ethers";
import { apiRequest } from "./queryClient";

// Arbitrum Testnet config
export const ARBITRUM_TESTNET = {
  chainId: "0x66eed",
  chainName: "Arbitrum Sepolia",
  nativeCurrency: {
    name: "Arbitrum Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
  blockExplorerUrls: ["https://sepolia.arbiscan.io/"],
};

// Check if a wallet is connected
export const isWalletConnected = async (): Promise<boolean> => {
  if (!window.ethereum) return false;
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    return accounts.length > 0;
  } catch (error) {
    console.error("Error checking wallet connection:", error);
    return false;
  }
};

// Connect to MetaMask wallet
export const connectWallet = async (): Promise<string | null> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    return accounts[0];
  } catch (error) {
    console.error("Error connecting to wallet:", error);
    throw error;
  }
};

// Get the current network
export const getNetwork = async (): Promise<{
  chainId: string;
  name: string;
  isArbitrumTestnet: boolean;
}> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    const isArbitrumTestnet = chainId === ARBITRUM_TESTNET.chainId;
    
    let name = "Unknown Network";
    if (isArbitrumTestnet) {
      name = "Arbitrum Sepolia";
    } else if (chainId === "0x1") {
      name = "Ethereum Mainnet";
    } else if (chainId === "0xaa36a7") {
      name = "Sepolia Testnet";
    }

    return {
      chainId,
      name,
      isArbitrumTestnet,
    };
  } catch (error) {
    console.error("Error getting network:", error);
    throw error;
  }
};

// Switch to Arbitrum Testnet
export const switchToArbitrumTestnet = async (): Promise<boolean> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    // First try to switch to the network
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARBITRUM_TESTNET.chainId }],
    });
    return true;
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [ARBITRUM_TESTNET],
        });
        return true;
      } catch (addError) {
        console.error("Error adding Arbitrum Testnet:", addError);
        throw addError;
      }
    }
    // Other errors
    console.error("Error switching to Arbitrum Testnet:", switchError);
    throw switchError;
  }
};

// Get account balance
export const getBalance = async (address: string): Promise<string> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Error getting balance:", error);
    throw error;
  }
};

// Deploy contract
export const deployContract = async (
  contractType: string,
  contractName: string,
  contractSymbol?: string,
  initialSupply?: string,
  customCode?: string
): Promise<{
  address: string;
  hash: string;
  abi: any[];
}> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    // Get compiled contract from backend
    const compileRes = await apiRequest("POST", "/api/compile", {
      contractType,
      contractCode: customCode,
    });
    const compiledContract = await compileRes.json();

    // Setup provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    // Create contract factory
    const factory = new ethers.ContractFactory(
      compiledContract.abi,
      compiledContract.bytecode,
      signer
    );
    
    // Deploy contract with appropriate constructor arguments
    let contract;
    if (contractType === "ERC20Token") {
      // Convert to wei (add 18 decimals)
      const initialSupplyWei = initialSupply ? ethers.parseUnits(initialSupply, 18) : ethers.parseUnits("1000000", 18);
      contract = await factory.deploy(contractName, contractSymbol || "TKN", initialSupplyWei);
    } else if (contractType === "BettingContract") {
      // Handle BettingContract specifically
      try {
        console.log("Deploying BettingContract with customCode:", customCode);
        
        // Parse the custom parameters if provided
        const params = customCode ? JSON.parse(customCode) : {};
        
        // Get the end date as timestamp
        const endDateTimestamp = params.endDate ? Math.floor(new Date(params.endDate).getTime() / 1000) : Math.floor(Date.now() / 1000) + 86400; // Default to 24h from now
        
        // Convert amount to wei
        const amountWei = initialSupply ? ethers.parseEther(initialSupply) : ethers.parseEther("0.01");
        
        console.log("Deploying with parameters:", {
          title: contractName,
          description: params.description || "No description",
          category: params.category || "other",
          outcome1: params.outcome1 || "Yes",
          outcome2: params.outcome2 || "No",
          endDate: endDateTimestamp,
          resolver: params.resolver || (await provider.getSigner()).address
        });
        
        // Deploy with value equal to the bet amount
        contract = await factory.deploy(
          contractName,
          params.description || "No description",
          params.category || "other",
          params.outcome1 || "Yes",
          params.outcome2 || "No",
          endDateTimestamp,
          params.resolver || (await provider.getSigner()).address,
          { value: amountWei }
        );
      } catch (error) {
        console.error("Error deploying BettingContract:", error);
        throw error;
      }
    } else {
      contract = await factory.deploy();
    }
    
    // Wait for deployment to finish
    await contract.deploymentTransaction()?.wait();
    
    // Get contract address and transaction hash
    const address = await contract.getAddress();
    const tx = contract.deploymentTransaction();
    
    if (!tx) {
      throw new Error("Deployment transaction not found");
    }
    
    // Save contract to backend
    await apiRequest("POST", "/api/contracts", {
      name: contractName,
      address: address,
      contractType: contractType,
      abi: compiledContract.abi,
      bytecode: compiledContract.bytecode,
      deployedByAddress: await signer.getAddress(),
      deployedAtBlock: tx.blockNumber,
      network: (await getNetwork()).name
    });
    
    // Save transaction to backend
    await apiRequest("POST", "/api/transactions", {
      hash: tx.hash,
      from: await signer.getAddress(),
      to: null,
      contractAddress: address,
      value: tx.value ? ethers.formatEther(tx.value) : "0",
      gasUsed: tx.gasLimit ? tx.gasLimit.toString() : "0",
      gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, "gwei") : "0",
      status: "success",
      type: "deploy",
      method: "deploy",
      args: null,
      blockNumber: tx.blockNumber,
      network: (await getNetwork()).name
    });
    
    return {
      address,
      hash: tx.hash,
      abi: compiledContract.abi
    };
  } catch (error) {
    console.error("Error deploying contract:", error);
    throw error;
  }
};

// Call a read function on a contract
export const callContractMethod = async (
  contractAddress: string,
  abi: any[],
  methodName: string,
  args: any[] = []
): Promise<any> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    return await contract[methodName](...args);
  } catch (error) {
    console.error(`Error calling ${methodName}:`, error);
    throw error;
  }
};

// Execute a write function on a contract
export const executeContractMethod = async (
  contractAddress: string,
  abi: any[],
  methodName: string,
  args: any[] = []
): Promise<{
  hash: string;
  success: boolean;
}> => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(contractAddress, abi, signer);
    
    const tx = await contract[methodName](...args);
    const receipt = await tx.wait();
    
    // Save transaction to backend
    await apiRequest("POST", "/api/transactions", {
      hash: tx.hash,
      from: await signer.getAddress(),
      to: contractAddress,
      contractAddress: contractAddress,
      value: tx.value ? ethers.formatEther(tx.value) : "0",
      gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : "0",
      gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, "gwei") : "0",
      status: receipt.status === 1 ? "success" : "failed",
      type: "call",
      method: methodName,
      args: JSON.stringify(args),
      blockNumber: receipt.blockNumber,
      network: (await getNetwork()).name
    });
    
    return {
      hash: tx.hash,
      success: receipt.status === 1
    };
  } catch (error) {
    console.error(`Error executing ${methodName}:`, error);
    throw error;
  }
};
