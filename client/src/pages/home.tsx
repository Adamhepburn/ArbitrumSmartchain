import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DeployContract } from "@/components/DeployContract";
import { DeploymentStatus } from "@/components/DeploymentStatus";
import { ContractInteraction } from "@/components/ContractInteraction";
import { ContractInfo } from "@/components/ContractInfo";
import { TransactionHistory } from "@/components/TransactionHistory";
import { useWeb3 } from "@/hooks/useWeb3";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Wallet, Code, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { isConnected, isArbitrumTestnet, connect, switchNetwork } = useWeb3();
  const [activeTab, setActiveTab] = useState("deploy");
  const [deploymentStep, setDeploymentStep] = useState(0);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [deployedContractAddress, setDeployedContractAddress] = useState<string | null>(null);
  const [deployedTransactionHash, setDeployedTransactionHash] = useState<string | null>(null);
  
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
              Connect your wallet to deploy and interact with smart contracts on Arbitrum Testnet.
              {!window.ethereum && (
                <span className="block mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                  MetaMask not detected, but you can still try the app in demo mode.
                </span>
              )}
            </p>
            <Button
              onClick={connect}
              className="mt-4 bg-primary hover:bg-primary-600 text-white font-medium inline-flex items-center"
            >
              <Wallet className="h-5 w-5 mr-2" />
              {window.ethereum ? "Connect MetaMask" : "Try Demo Mode"}
            </Button>
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
            <Tabs defaultValue="deploy" value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-dark-200 dark:border-dark-700">
                <TabsList className="bg-transparent">
                  <TabsTrigger value="deploy">Deploy Contract</TabsTrigger>
                  <TabsTrigger value="interact">Interact</TabsTrigger>
                  <TabsTrigger value="transactions">Transactions</TabsTrigger>
                </TabsList>
              </div>

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
                  {/* Contract Interaction */}
                  <div className="lg:col-span-2">
                    <ContractInteraction onContractLoad={handleContractLoad} />
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
            </Tabs>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
