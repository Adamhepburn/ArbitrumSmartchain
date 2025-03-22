import { useState, useEffect, useCallback } from "react";
import { 
  connectWallet, 
  getNetwork, 
  getBalance, 
  isWalletConnected, 
  switchToArbitrumTestnet,
  deployContract,
  callContractMethod,
  executeContractMethod
} from "@/lib/web3";
import {
  mockConnectWallet,
  mockGetNetwork,
  mockGetBalance,
  mockIsWalletConnected,
  mockSwitchToArbitrumTestnet,
  mockDeployContract,
  mockCallContractMethod,
  mockExecuteContractMethod
} from "@/lib/mockWeb3";
import { useToast } from "@/hooks/use-toast";

interface Web3State {
  isConnected: boolean;
  isLoading: boolean;
  account: string | null;
  chainId: string | null;
  networkName: string | null;
  isArbitrumTestnet: boolean;
  balance: string | null;
}

export function useWeb3() {
  const [state, setState] = useState<Web3State>({
    isConnected: false,
    isLoading: true,
    account: null,
    chainId: null,
    networkName: null,
    isArbitrumTestnet: false,
    balance: null,
  });
  const { toast } = useToast();

  // Check if we should use mock implementation
  const [useMock] = useState(!window.ethereum);

  // Check wallet connection on initial load
  const checkConnection = useCallback(async () => {
    try {
      // Use either real or mock implementation
      const connected = useMock 
        ? await mockIsWalletConnected()
        : await isWalletConnected();
      
      if (connected) {
        if (useMock) {
          // Mock implementation
          const account = localStorage.getItem("mockWalletAddress") || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
          const { chainId, name, isArbitrumTestnet } = await mockGetNetwork();
          const balance = await mockGetBalance(account);
          
          setState({
            isConnected: true,
            isLoading: false,
            account,
            chainId,
            networkName: name,
            isArbitrumTestnet,
            balance,
          });
        } else {
          // Real implementation with MetaMask
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          const account = accounts[0];
          const { chainId, name, isArbitrumTestnet } = await getNetwork();
          const balance = await getBalance(account);
          
          setState({
            isConnected: true,
            isLoading: false,
            account,
            chainId,
            networkName: name,
            isArbitrumTestnet,
            balance,
          });
        }
      } else {
        setState({
          isConnected: false,
          isLoading: false,
          account: null,
          chainId: null,
          networkName: null,
          isArbitrumTestnet: false,
          balance: null,
        });
      }
    } catch (error) {
      console.error("Error checking connection:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [useMock]);

  useEffect(() => {
    checkConnection();
    
    // Set up event listeners
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", checkConnection);
      window.ethereum.on("chainChanged", checkConnection);
      window.ethereum.on("connect", checkConnection);
      window.ethereum.on("disconnect", checkConnection);
    }
    
    return () => {
      // Clean up event listeners
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", checkConnection);
        window.ethereum.removeListener("chainChanged", checkConnection);
        window.ethereum.removeListener("connect", checkConnection);
        window.ethereum.removeListener("disconnect", checkConnection);
      }
    };
  }, [checkConnection]);

  // Connect wallet function
  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      if (useMock) {
        // Use mock connect
        const address = await mockConnectWallet();
        localStorage.setItem("mockWalletAddress", address);
        await checkConnection();
        
        toast({
          title: "Mock wallet connected",
          description: "A simulated wallet has been connected for demonstration",
        });
      } else if (!window.ethereum) {
        toast({
          title: "MetaMask not installed",
          description: "Using demo mode since MetaMask is not available",
          variant: "destructive",
        });
        
        // Switch to mock mode for this session
        const address = await mockConnectWallet();
        localStorage.setItem("mockWalletAddress", address);
        await checkConnection();
      } else {
        // Use real connect
        await connectWallet();
        await checkConnection();
        
        toast({
          title: "Wallet connected",
          description: "Your wallet has been connected successfully",
        });
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection error",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [checkConnection, toast, useMock]);

  // Switch network function
  const switchNetwork = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      if (useMock) {
        // Use mock switch network
        await mockSwitchToArbitrumTestnet();
      } else {
        // Use real switch network
        await switchToArbitrumTestnet();
      }
      
      await checkConnection();
      
      toast({
        title: "Network switched",
        description: "Successfully switched to Arbitrum Testnet",
      });
    } catch (error: any) {
      console.error("Error switching network:", error);
      toast({
        title: "Network switch error",
        description: error.message || "Failed to switch network",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [checkConnection, toast, useMock]);

  // Deploy contract function
  const deploy = useCallback(async (
    contractType: string,
    contractName: string,
    contractSymbol?: string,
    initialSupply?: string,
    customCode?: string
  ) => {
    try {
      if (!state.isConnected) {
        throw new Error("Wallet not connected");
      }
      
      if (!state.isArbitrumTestnet) {
        throw new Error("Please switch to Arbitrum Testnet");
      }
      
      let result;
      if (useMock) {
        // Use mock deploy
        result = await mockDeployContract(
          contractType,
          contractName,
          contractSymbol,
          initialSupply,
          customCode
        );
      } else {
        // Use real deploy
        result = await deployContract(
          contractType,
          contractName,
          contractSymbol,
          initialSupply,
          customCode
        );
      }
      
      toast({
        title: "Contract deployed",
        description: `Contract deployed successfully at ${result.address.substring(0, 8)}...`,
      });
      
      return result;
    } catch (error: any) {
      console.error("Error deploying contract:", error);
      toast({
        title: "Deployment error",
        description: error.message || "Failed to deploy contract",
        variant: "destructive",
      });
      throw error;
    }
  }, [state.isConnected, state.isArbitrumTestnet, toast, useMock]);

  // Call contract read method
  const callMethod = useCallback(async (
    contractAddress: string,
    abi: any[],
    methodName: string,
    args: any[] = []
  ) => {
    try {
      if (!state.isConnected) {
        throw new Error("Wallet not connected");
      }
      
      if (useMock) {
        // Use mock call
        return await mockCallContractMethod(contractAddress, abi, methodName, args);
      } else {
        // Use real call
        return await callContractMethod(contractAddress, abi, methodName, args);
      }
    } catch (error: any) {
      console.error(`Error calling ${methodName}:`, error);
      toast({
        title: `Error calling ${methodName}`,
        description: error.message || "Transaction failed",
        variant: "destructive",
      });
      throw error;
    }
  }, [state.isConnected, toast, useMock]);

  // Execute contract write method
  const executeMethod = useCallback(async (
    contractAddress: string,
    abi: any[],
    methodName: string,
    args: any[] = []
  ) => {
    try {
      if (!state.isConnected) {
        throw new Error("Wallet not connected");
      }
      
      if (!state.isArbitrumTestnet) {
        throw new Error("Please switch to Arbitrum Testnet");
      }
      
      let result;
      if (useMock) {
        // Use mock execute
        result = await mockExecuteContractMethod(contractAddress, abi, methodName, args);
      } else {
        // Use real execute
        result = await executeContractMethod(contractAddress, abi, methodName, args);
      }
      
      toast({
        title: "Transaction successful",
        description: `Method ${methodName} executed successfully`,
      });
      
      return result;
    } catch (error: any) {
      console.error(`Error executing ${methodName}:`, error);
      toast({
        title: `Error executing ${methodName}`,
        description: error.message || "Transaction failed",
        variant: "destructive",
      });
      throw error;
    }
  }, [state.isConnected, state.isArbitrumTestnet, toast, useMock]);

  return {
    ...state,
    connect,
    switchNetwork,
    deploy,
    callMethod,
    executeMethod,
    refreshConnection: checkConnection,
  };
}
