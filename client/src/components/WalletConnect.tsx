import { useWeb3 } from "@/hooks/useWeb3";
import { Button } from "@/components/ui/button";
import { NetworkBadge } from "@/components/NetworkBadge";
import { Wallet, AlertCircle, Code } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface WalletConnectProps {
  className?: string;
}

export function WalletConnect({ className }: WalletConnectProps) {
  const {
    isConnected,
    isLoading,
    account,
    networkName,
    isArbitrumTestnet,
    balance,
    connect,
    switchNetwork,
  } = useWeb3();
  
  // Check if we're in demo mode
  const isDemoMode = !window.ethereum && isConnected;

  const displayAccount = account
    ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}`
    : "";

  if (!isConnected) {
    return (
      <Button
        disabled={isLoading}
        onClick={connect}
        className={`bg-primary hover:bg-primary-600 text-white font-medium flex items-center ${className}`}
      >
        <Wallet className="h-5 w-5 mr-2" />
        Connect Wallet
      </Button>
    );
  }

  if (!isArbitrumTestnet) {
    return (
      <div className="space-y-2">
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Wrong Network</AlertTitle>
          <AlertDescription>
            Please switch to Arbitrum Testnet to use this application.
          </AlertDescription>
        </Alert>
        <Button
          disabled={isLoading}
          onClick={switchNetwork}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          Switch Network
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <NetworkBadge 
        networkName={networkName} 
        isConnected={isConnected}
        isNetworkSupported={isArbitrumTestnet}
      />
      <div className="flex items-center space-x-2 bg-dark-100 dark:bg-dark-700 px-3 py-1.5 rounded-lg">
        <Wallet className="h-5 w-5 text-secondary" />
        <div className="text-sm flex flex-col">
          <span className="text-dark-500 dark:text-dark-300 text-xs">Connected Wallet</span>
          <span className="font-mono text-dark-800 dark:text-white">{displayAccount}</span>
        </div>
      </div>
    </div>
  );
}
