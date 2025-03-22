import { ethers } from "ethers";
import { apiRequest } from "./queryClient";
import { ARBITRUM_TESTNET } from "./web3";

// Mock wallet address and private key (for demo only)
const MOCK_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
const MOCK_CHAIN_ID = ARBITRUM_TESTNET.chainId;

// Check if a wallet is connected (mock)
export const mockIsWalletConnected = async (): Promise<boolean> => {
  return localStorage.getItem("mockWalletConnected") === "true";
};

// Connect to mock wallet
export const mockConnectWallet = async (): Promise<string> => {
  localStorage.setItem("mockWalletConnected", "true");
  return MOCK_ADDRESS;
};

// Get the current network (mock)
export const mockGetNetwork = async (): Promise<{
  chainId: string;
  name: string;
  isArbitrumTestnet: boolean;
}> => {
  return {
    chainId: MOCK_CHAIN_ID,
    name: "Arbitrum Sepolia (Mock)",
    isArbitrumTestnet: true,
  };
};

// Switch to Arbitrum Testnet (mock)
export const mockSwitchToArbitrumTestnet = async (): Promise<boolean> => {
  return true;
};

// Get account balance (mock)
export const mockGetBalance = async (address: string): Promise<string> => {
  return "10.0"; // Mock balance of 10 ETH
};

// Deploy contract (mock)
export const mockDeployContract = async (
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
  try {
    // Get compiled contract from backend
    const compileRes = await apiRequest("POST", "/api/compile", {
      contractType,
      contractCode: customCode,
    });
    const compiledContract = await compileRes.json();

    // Mock contract address and transaction hash
    const mockContractAddress = `0x${Math.random().toString(16).substring(2, 42)}`;
    const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    
    // Save contract to backend
    await apiRequest("POST", "/api/contracts", {
      name: contractName,
      address: mockContractAddress,
      contractType: contractType,
      abi: compiledContract.abi,
      bytecode: compiledContract.bytecode,
      deployedByAddress: MOCK_ADDRESS,
      deployedAtBlock: 1234567,
      network: "Arbitrum Sepolia (Mock)"
    });
    
    // Save transaction to backend
    await apiRequest("POST", "/api/transactions", {
      hash: mockTxHash,
      from: MOCK_ADDRESS,
      to: null,
      contractAddress: mockContractAddress,
      value: "0",
      gasUsed: "3000000",
      gasPrice: "1.5",
      status: "success",
      type: "deploy",
      method: "deploy",
      args: null,
      blockNumber: 1234567,
      network: "Arbitrum Sepolia (Mock)"
    });
    
    return {
      address: mockContractAddress,
      hash: mockTxHash,
      abi: compiledContract.abi
    };
  } catch (error) {
    console.error("Error in mock deploy contract:", error);
    throw error;
  }
};

// Call a read function on a contract (mock)
export const mockCallContractMethod = async (
  contractAddress: string,
  abi: any[],
  methodName: string,
  args: any[] = []
): Promise<any> => {
  // Return mock responses based on contract method
  if (methodName === "get") {
    return ethers.toBigInt(42); // For SimpleStorage contract
  } else if (methodName === "balanceOf") {
    return ethers.parseUnits("1000", 18); // For ERC20 contract
  } else if (methodName === "name") {
    return "Mock Token";
  } else if (methodName === "symbol") {
    return "MOCK";
  } else if (methodName === "decimals") {
    return 18;
  } else if (methodName === "totalSupply") {
    return ethers.parseUnits("1000000", 18);
  }
  
  return "Mock response for " + methodName;
};

// Execute a write function on a contract (mock)
export const mockExecuteContractMethod = async (
  contractAddress: string,
  abi: any[],
  methodName: string,
  args: any[] = []
): Promise<{
  hash: string;
  success: boolean;
}> => {
  // Generate a mock transaction hash
  const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
  
  // Save transaction to backend
  await apiRequest("POST", "/api/transactions", {
    hash: mockTxHash,
    from: MOCK_ADDRESS,
    to: contractAddress,
    contractAddress: contractAddress,
    value: "0",
    gasUsed: "100000",
    gasPrice: "1.2",
    status: "success",
    type: "call",
    method: methodName,
    args: JSON.stringify(args),
    blockNumber: 1234568,
    network: "Arbitrum Sepolia (Mock)"
  });
  
  return {
    hash: mockTxHash,
    success: true
  };
};