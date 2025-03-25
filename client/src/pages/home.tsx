import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DeployContract } from "@/components/DeployContract";
import { DeploymentStatus } from "@/components/DeploymentStatus";
import { ContractInteraction } from "@/components/ContractInteraction";
import { ContractInfo } from "@/components/ContractInfo";
import { TransactionHistory } from "@/components/TransactionHistory";
import { BetCreation } from "@/components/BetCreation";
import { BetInteraction } from "@/components/BetInteraction";
import { WalletManager } from "@/components/WalletManager";
import { useWeb3 } from "@/hooks/useWeb3";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Wallet, Code, Info, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { isConnected, isArbitrumTestnet, connect, switchNetwork } = useWeb3();
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("bet");
  const [deploymentStep, setDeploymentStep] = useState(0);
  const [betCreationStep, setBetCreationStep] = useState(0);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [deployedContractAddress, setDeployedContractAddress] = useState<string | null>(null);
  const [deployedTransactionHash, setDeployedTransactionHash] = useState<string | null>(null);
  const [createdBetAddress, setCreatedBetAddress] = useState<string | null>(null);
  const [createdBetHash, setCreatedBetHash] = useState<string | null>(null);
  
  // Check if we're in demo mode
  const isDemoMode = !window.ethereum && isConnected;

  const handleDeployStart = () => {
    setDeploymentStep(0);
  };

  const handleDeployProgress = (step: number) => {
    setDeploymentStep(step);
  };

  const handleDeployComplete = (contractAddress: string, transactionHash: string) => {
    setDeployedContractAddress(contractAddress);
    setDeployedTransactionHash(transactionHash);
  };

  const handleDeployError = (error: Error) => {
    setDeploymentStep(0);
  };

  const handleContractLoad = (contract: any) => {
    setSelectedContract(contract);
  };
  
  // Bet creation handlers
  const handleBetCreationStart = () => {
    setBetCreationStep(0);
  };
  
  const handleBetCreationProgress = (step: number) => {
    setBetCreationStep(step);
  };
  
  const handleBetCreationComplete = (betAddress: string, transactionHash: string) => {
    setCreatedBetAddress(betAddress);
    setCreatedBetHash(transactionHash);
    // Switch to interact tab to allow interaction with the newly created bet
    setActiveTab("interact");
    // Automatically load the contract for interaction
    setSelectedContract({
      name: "Betting Contract",
      address: betAddress,
      network: "Arbitrum Testnet",
      deployedAtBlock: Date.now() // Using timestamp as a proxy since we don't have the actual block number
    });
  };
  
  const handleBetCreationError = (error: Error) => {
    console.error("Bet creation error:", error);
    setBetCreationStep(0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-900 text-dark-800 dark:text-white">
      <ThemeToggle />
      <Header />

      <main className="flex-grow py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Not Connected Warning */}
        {!isConnected && (
          <div className="rounded-lg bg-white dark:bg-dark-800 p-6 shadow-sm mb-6 text-center border border-dark-200 dark:border-dark-700">
            <Wallet className="h-12 w-12 mx-auto text-dark-400" />
            <h2 className="mt-4 text-xl font-medium">Connect Your Wallet</h2>
            <p className="mt-2 text-dark-500 dark:text-dark-400">
              {user ? (
                <>
                  Welcome <span className="font-medium">{user.username}</span>! Your in-app wallet is ready to use.
                </>
              ) : (
                <>
                  Connect your wallet to deploy and interact with smart contracts on Arbitrum Testnet.
                  {!window.ethereum && (
                    <span className="block mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                      MetaMask not detected, but you can still try the app in demo mode.
                    </span>
                  )}
                </>
              )}
            </p>
            
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              {!user && (
                <Button
                  onClick={connect}
                  className="bg-primary hover:bg-primary-600 text-white font-medium inline-flex items-center"
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  {window.ethereum ? "Connect MetaMask" : "Try Demo Mode"}
                </Button>
              )}
              
              {!user && (
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/auth"}
                  className="border-primary text-primary hover:bg-primary/10 inline-flex items-center"
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  Register / Login
                </Button>
              )}
              
              {user && (
                <Button
                  onClick={() => {
                    connect(); 
                    setActiveTab("wallet");
                  }}
                  className="bg-primary hover:bg-primary-600 text-white font-medium inline-flex items-center"
                >
                  <Wallet className="h-5 w-5 mr-2" />
                  Use In-App Wallet
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Wrong Network Warning */}
        {isConnected && !isArbitrumTestnet && (
          <Alert variant="destructive" className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-6 w-6 text-yellow-500" />
            <AlertTitle className="text-lg font-medium text-yellow-800 dark:text-yellow-200">
              Wrong Network
              {!window.ethereum && (
                <span className="ml-2 text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-0.5 rounded-md">
                  Demo Mode
                </span>
              )}
            </AlertTitle>
            <AlertDescription className="mt-2 text-yellow-700 dark:text-yellow-300">
              <p>
                {window.ethereum 
                  ? "Please switch to Arbitrum Testnet in your MetaMask wallet to use this application."
                  : "In demo mode, we need to simulate being on the correct network."
                }
              </p>
              <Button
                onClick={switchNetwork}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700"
              >
                Switch Network
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Connected Content */}
        {isConnected && isArbitrumTestnet && (
          <div className="space-y-6">
            {/* Demo Mode Banner */}
            {isDemoMode && (
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 mb-4">
                <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                <AlertTitle className="flex items-center text-blue-700 dark:text-blue-300 font-medium">
                  Demo Mode Active
                  <Badge className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 flex items-center">
                    <Code className="h-3 w-3 mr-1" />
                    Simulated Blockchain
                  </Badge>
                </AlertTitle>
                <AlertDescription className="text-blue-600 dark:text-blue-400">
                  You're using the application in demo mode. All blockchain interactions are simulated.
                  To use real blockchain transactions, please install MetaMask.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Tabs */}
            <Tabs defaultValue="bet" value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-dark-200 dark:border-dark-700">
                <TabsList className="bg-transparent">
                  <TabsTrigger value="bet">Create Bet</TabsTrigger>
                  <TabsTrigger value="deploy">Deploy Contract</TabsTrigger>
                  <TabsTrigger value="interact">Interact</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                  <TabsTrigger value="wallet">My Wallet</TabsTrigger>
                </TabsList>
              </div>
              
              {/* Bet Creation Tab */}
              <TabsContent value="bet" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Bet Creation Form */}
                  <div className="lg:col-span-2">
                    <BetCreation
                      onBetCreationStart={handleBetCreationStart}
                      onBetCreationProgress={handleBetCreationProgress}
                      onBetCreationComplete={handleBetCreationComplete}
                      onBetCreationError={handleBetCreationError}
                    />
                  </div>

                  {/* Bet Creation Status */}
                  <div className="lg:col-span-1">
                    <DeploymentStatus 
                      currentStep={betCreationStep} 
                    />
                    
                    {createdBetAddress && (
                      <div className="mt-6 rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
                        <h3 className="font-medium text-green-800 dark:text-green-200 flex items-center">
                          <Info className="h-5 w-5 mr-2" />
                          Bet Successfully Created
                        </h3>
                        <div className="mt-2 space-y-2">
                          <div className="text-sm text-green-700 dark:text-green-300">
                            <span className="font-medium">Contract Address:</span>
                            <p className="font-mono text-xs break-all mt-1">{createdBetAddress}</p>
                          </div>
                          <div className="text-sm text-green-700 dark:text-green-300">
                            <span className="font-medium">Transaction Hash:</span>
                            <p className="font-mono text-xs break-all mt-1">{createdBetHash}</p>
                          </div>
                          <Button
                            onClick={() => setActiveTab("interact")}
                            variant="outline" 
                            className="mt-2 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/40"
                          >
                            Interact with this Bet
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Deploy Contract Tab */}
              <TabsContent value="deploy" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Contract Form */}
                  <div className="lg:col-span-2">
                    <DeployContract
                      onDeployStart={handleDeployStart}
                      onDeployProgress={handleDeployProgress}
                      onDeployComplete={handleDeployComplete}
                      onDeployError={handleDeployError}
                    />
                  </div>

                  {/* Deployment Status */}
                  <div className="lg:col-span-1">
                    <DeploymentStatus currentStep={deploymentStep} />
                  </div>
                </div>
              </TabsContent>

              {/* Interact Tab */}
              <TabsContent value="interact" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Interaction Form */}
                  <div className="lg:col-span-2">
                    {/* Show specialized betting interface if a bet contract is selected */}
                    {selectedContract && selectedContract.name === "Betting Contract" ? (
                      <BetInteraction 
                        contractAddress={selectedContract.address} 
                        account={user ? user.walletAddress : null}
                      />
                    ) : (
                      <ContractInteraction onContractLoad={handleContractLoad} />
                    )}
                  </div>

                  {/* Contract Info */}
                  <div className="lg:col-span-1">
                    <ContractInfo contract={selectedContract} />
                  </div>
                </div>
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="mt-6">
                <TransactionHistory />
              </TabsContent>
              
              {/* Wallet Tab */}
              <TabsContent value="wallet" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Wallet Manager */}
                  <div className="lg:col-span-2">
                    <WalletManager />
                  </div>
                  
                  {/* Wallet Info and Logout */}
                  <div className="lg:col-span-1">
                    {user && (
                      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm p-6 border border-dark-200 dark:border-dark-700">
                        <h3 className="text-lg font-medium mb-4">Account Details</h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-dark-500 dark:text-dark-400">Username</p>
                            <p className="font-medium">{user.username}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-dark-500 dark:text-dark-400">Account Created</p>
                            <p className="font-medium">
                              {new Date(user.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          
                          <Button
                            variant="outline"
                            className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                            onClick={() => logoutMutation.mutate()}
                            disabled={logoutMutation.isPending}
                          >
                            {logoutMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Logging out...
                              </>
                            ) : (
                              <>
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
