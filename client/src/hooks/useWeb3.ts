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

  // Check wallet connection on initial load
  const checkConnection = useCallback(async () => {
    try {
      const connected = await isWalletConnected();
      
      if (connected) {
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
  }, []);

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
      
      if (!window.ethereum) {
        toast({
          title: "MetaMask not installed",
          description: "Please install MetaMask to use this application",
          variant: "destructive",
        });
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }
      
      await connectWallet();
      await checkConnection();
      
      toast({
        title: "Wallet connected",
        description: "Your wallet has been connected successfully",
      });
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection error",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [checkConnection, toast]);

  // Switch network function
  const switchNetwork = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      await switchToArbitrumTestnet();
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
  }, [checkConnection, toast]);

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
      
      const result = await deployContract(
        contractType,
        contractName,
        contractSymbol,
        initialSupply,
        customCode
      );
      
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
  }, [state.isConnected, state.isArbitrumTestnet, toast]);

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
      
      return await callContractMethod(contractAddress, abi, methodName, args);
    } catch (error: any) {
      console.error(`Error calling ${methodName}:`, error);
      toast({
        title: `Error calling ${methodName}`,
        description: error.message || "Transaction failed",
        variant: "destructive",
      });
      throw error;
    }
  }, [state.isConnected, toast]);

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
      
      const result = await executeContractMethod(contractAddress, abi, methodName, args);
      
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
  }, [state.isConnected, state.isArbitrumTestnet, toast]);

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
