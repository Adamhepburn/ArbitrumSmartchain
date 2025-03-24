import { useState, useEffect } from "react";
import { useWeb3 } from "@/hooks/useWeb3";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { callContractMethod, executeContractMethod } from "@/lib/web3";
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Award, 
  Users, 
  Calendar, 
  ArrowRight, 
  DollarSign,
  User,
  Wallet,
  Handshake,
  Medal,
  X
} from "lucide-react";

interface BetDetails {
  title: string;
  description: string;
  category: string;
  outcome1: string;
  outcome2: string;
  endDate: number;
  betAmount: string;
  creator: string;
  acceptor: string;
  resolver: string;
  status: number; // 0: Open, 1: Accepted, 2: Resolved, 3: Voided
  outcome: number; // 0: NotResolved, 1: Outcome1Wins, 2: Outcome2Wins, 3: Draw
}

interface BetInteractionProps {
  contractAddress: string;
  account: string | null;
}

export function BetInteraction({ contractAddress, account }: BetInteractionProps) {
  const { isConnected } = useWeb3();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionPending, setTransactionPending] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState<string | null>(null);
  const [betDetails, setBetDetails] = useState<BetDetails | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  
  // Fetch bet details
  useEffect(() => {
    async function fetchBetDetails() {
      setLoading(true);
      setError(null);
      
      try {
        if (!contractAddress) {
          setError("No contract address provided");
          setLoading(false);
          return;
        }
        
        const result = await callContractMethod(
          contractAddress,
          "getBetDetails",
          [],
          [
            {
              "inputs": [],
              "name": "getBetDetails",
              "outputs": [
                {
                  "components": [
                    { "internalType": "string", "name": "title", "type": "string" },
                    { "internalType": "string", "name": "description", "type": "string" },
                    { "internalType": "string", "name": "category", "type": "string" },
                    { "internalType": "string", "name": "outcome1", "type": "string" },
                    { "internalType": "string", "name": "outcome2", "type": "string" },
                    { "internalType": "uint256", "name": "endDate", "type": "uint256" },
                    { "internalType": "uint256", "name": "betAmount", "type": "uint256" },
                    { "internalType": "address", "name": "creator", "type": "address" },
                    { "internalType": "address", "name": "acceptor", "type": "address" },
                    { "internalType": "address", "name": "resolver", "type": "address" },
                    { "internalType": "enum BettingContract.Status", "name": "status", "type": "uint8" },
                    { "internalType": "enum BettingContract.Outcome", "name": "outcome", "type": "uint8" }
                  ],
                  "internalType": "struct BettingContract.BetDetails",
                  "name": "",
                  "type": "tuple"
                }
              ],
              "stateMutability": "view",
              "type": "function"
            }
          ]
        );
        
        if (result && result.length > 0) {
          const details = result[0];
          setBetDetails({
            title: details[0] || "Untitled Bet",
            description: details[1] || "No description provided",
            category: details[2] || "Other",
            outcome1: details[3] || "Outcome 1",
            outcome2: details[4] || "Outcome 2",
            endDate: parseInt(details[5]) || 0,
            betAmount: details[6] ? (window.ethereum ? window.ethereum.utils?.formatEther(details[6]) : details[6]) : "0",
            creator: details[7] || "0x0",
            acceptor: details[8] || "0x0",
            resolver: details[9] || "0x0",
            status: parseInt(details[10]) || 0,
            outcome: parseInt(details[11]) || 0
          });
        }
      } catch (err: any) {
        console.error("Error fetching bet details:", err);
        setError(err.message || "Error fetching bet details");
      } finally {
        setLoading(false);
      }
    }
    
    fetchBetDetails();
  }, [contractAddress, transactionSuccess]);
  
  // Function to handle accepting the bet
  const handleAcceptBet = async () => {
    if (!isConnected || !betDetails) return;
    
    setTransactionPending(true);
    setError(null);
    
    try {
      const result = await executeContractMethod(
        contractAddress,
        "acceptBet",
        [],
        [
          {
            "inputs": [],
            "name": "acceptBet",
            "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
            "stateMutability": "payable",
            "type": "function"
          }
        ],
        betDetails.betAmount
      );
      
      setTransactionSuccess(`Successfully accepted the bet! Transaction hash: ${result.hash}`);
      // Auto-switch to details tab after accepting
      setActiveTab("details");
    } catch (err: any) {
      console.error("Error accepting bet:", err);
      setError(err.message || "Error accepting the bet");
    } finally {
      setTransactionPending(false);
    }
  };
  
  // Function to handle resolving the bet
  const handleResolveBet = async (outcomeValue: number) => {
    if (!isConnected || !betDetails) return;
    
    setTransactionPending(true);
    setError(null);
    
    try {
      const result = await executeContractMethod({
        contractAddress,
        method: "resolveBet",
        args: [outcomeValue],
        abi: [
          {
            "inputs": [{ "internalType": "enum BettingContract.Outcome", "name": "_outcome", "type": "uint8" }],
            "name": "resolveBet",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ]
      });
      
      setTransactionSuccess(`Successfully resolved the bet! Transaction hash: ${result.hash}`);
      // Auto-switch to details tab after resolving
      setActiveTab("details");
    } catch (err: any) {
      console.error("Error resolving bet:", err);
      setError(err.message || "Error resolving the bet");
    } finally {
      setTransactionPending(false);
    }
  };
  
  // Function to handle voiding the bet
  const handleVoidBet = async () => {
    if (!isConnected || !betDetails) return;
    
    setTransactionPending(true);
    setError(null);
    
    try {
      const result = await executeContractMethod({
        contractAddress,
        method: "voidBet",
        args: [],
        abi: [
          {
            "inputs": [],
            "name": "voidBet",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
          }
        ]
      });
      
      setTransactionSuccess(`Successfully voided the bet! Transaction hash: ${result.hash}`);
      // Auto-switch to details tab after voiding
      setActiveTab("details");
    } catch (err: any) {
      console.error("Error voiding bet:", err);
      setError(err.message || "Error voiding the bet");
    } finally {
      setTransactionPending(false);
    }
  };
  
  // Format date from unix timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };
  
  // Get status text and color
  const getStatusInfo = (status: number) => {
    switch (status) {
      case 0:
        return { text: "Open", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300", icon: Clock };
      case 1:
        return { text: "Accepted", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300", icon: Handshake };
      case 2:
        return { text: "Resolved", color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300", icon: CheckCircle2 };
      case 3:
        return { text: "Voided", color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300", icon: X };
      default:
        return { text: "Unknown", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", icon: AlertCircle };
    }
  };
  
  // Get outcome text
  const getOutcomeText = (outcome: number) => {
    switch (outcome) {
      case 0:
        return "Not Resolved";
      case 1:
        return betDetails?.outcome1 || "Outcome 1 Wins";
      case 2:
        return betDetails?.outcome2 || "Outcome 2 Wins";
      case 3:
        return "Draw";
      default:
        return "Unknown";
    }
  };
  
  // Truncate address
  const truncateAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Check if current user is creator
  const isCreator = account && betDetails?.creator === account;
  
  // Check if current user is acceptor
  const isAcceptor = account && betDetails?.acceptor === account;
  
  // Check if current user is resolver
  const isResolver = account && betDetails?.resolver === account;
  
  // Check if the bet is open and can be accepted
  const canAccept = betDetails?.status === 0 && !isCreator;
  
  // Check if the bet is accepted and can be resolved (by resolver)
  const canResolve = betDetails?.status === 1 && isResolver;
  
  // Check if the bet can be voided (by resolver, while open or accepted)
  const canVoid = (betDetails?.status === 0 || betDetails?.status === 1) && isResolver;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error Loading Bet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <p className="mt-4 text-dark-500 dark:text-dark-400">
            There was an error loading the bet details. Please check the contract address and try again.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  if (!betDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Bet Found</CardTitle>
          <CardDescription>
            No bet details available for the specified address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-dark-500 dark:text-dark-400">
            Please make sure you've entered a valid betting contract address.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Get status info
  const statusInfo = getStatusInfo(betDetails.status);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl">{betDetails.title}</CardTitle>
            <CardDescription className="mt-1">
              <Badge variant="outline" className="mr-2">
                {betDetails.category}
              </Badge>
              <Badge className={`${statusInfo.color} flex items-center gap-1`}>
                <statusInfo.icon className="h-3 w-3" />
                {statusInfo.text}
              </Badge>
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center">
            <DollarSign className="h-3 w-3 mr-1" />
            {betDetails.betAmount} ETH
          </Badge>
        </div>
      </CardHeader>
      
      {/* Transaction Success Message */}
      {transactionSuccess && (
        <div className="px-6 pt-2">
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-200">Transaction Successful</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300 text-sm">
              {transactionSuccess}
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="px-6 pt-2">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      
      <CardContent className="pt-4">
        <Tabs 
          defaultValue="details" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="actions" disabled={betDetails.status >= 2}>Actions</TabsTrigger>
          </TabsList>
          
          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-dark-500 dark:text-dark-400 mb-1">Description</h3>
              <p className="text-dark-800 dark:text-dark-200">{betDetails.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 dark:bg-dark-800 p-3 rounded-lg">
                <h3 className="text-sm font-medium text-dark-500 dark:text-dark-400 mb-2 flex items-center">
                  <Award className="h-4 w-4 mr-1 text-primary" />
                  Outcomes
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-medium mr-2">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{betDetails.outcome1}</p>
                    </div>
                    {betDetails.outcome === 1 && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 ml-2">
                        Winner
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center">
                    <div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-medium mr-2">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{betDetails.outcome2}</p>
                    </div>
                    {betDetails.outcome === 2 && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 ml-2">
                        Winner
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-dark-800 p-3 rounded-lg">
                <h3 className="text-sm font-medium text-dark-500 dark:text-dark-400 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-primary" />
                  Important Dates
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Resolution Date:</span>
                    <span className="text-sm font-medium">{formatDate(betDetails.endDate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Current Status:</span>
                    <Badge className={statusInfo.color}>
                      {statusInfo.text}
                    </Badge>
                  </div>
                  {betDetails.status === 2 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Winning Outcome:</span>
                      <span className="text-sm font-medium">{getOutcomeText(betDetails.outcome)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Participants Tab */}
          <TabsContent value="participants" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-gray-50 dark:bg-dark-800 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-dark-500 dark:text-dark-400 mb-3 flex items-center">
                  <Users className="h-4 w-4 mr-1 text-primary" />
                  Participants
                </h3>
                
                <div className="space-y-4">
                  {/* Creator */}
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium flex items-center">
                        Creator 
                        {isCreator && <Badge className="ml-2 text-xs">You</Badge>}
                      </p>
                      <p className="text-sm text-dark-500 dark:text-dark-400 font-mono">
                        {betDetails.creator}
                      </p>
                    </div>
                  </div>
                  
                  {/* Acceptor */}
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mr-3">
                      <Handshake className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium flex items-center">
                        Acceptor
                        {isAcceptor && <Badge className="ml-2 text-xs">You</Badge>}
                      </p>
                      {betDetails.acceptor && betDetails.acceptor !== "0x0" ? (
                        <p className="text-sm text-dark-500 dark:text-dark-400 font-mono">
                          {betDetails.acceptor}
                        </p>
                      ) : (
                        <p className="text-sm text-dark-500 dark:text-dark-400 italic">
                          Not yet accepted
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Resolver */}
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mr-3">
                      <Medal className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium flex items-center">
                        Resolver
                        {isResolver && <Badge className="ml-2 text-xs">You</Badge>}
                      </p>
                      <p className="text-sm text-dark-500 dark:text-dark-400 font-mono">
                        {betDetails.resolver}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4">
            {canAccept && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <h3 className="text-base font-medium text-blue-800 dark:text-blue-300 mb-2">Accept Bet</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                  By accepting this bet, you agree to lock {betDetails.betAmount} ETH into the smart contract.
                  The winner will receive the full pot of {parseFloat(betDetails.betAmount) * 2} ETH.
                </p>
                <Button 
                  onClick={handleAcceptBet}
                  disabled={transactionPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {transactionPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Accept Bet for {betDetails.betAmount} ETH
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {canResolve && (
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
                <h3 className="text-base font-medium text-green-800 dark:text-green-300 mb-2">Resolve Bet</h3>
                <p className="text-sm text-green-700 dark:text-green-400 mb-4">
                  As the resolver, you can determine the outcome of this bet. The winning party will
                  receive the full pot of {parseFloat(betDetails.betAmount) * 2} ETH.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  <Button 
                    onClick={() => handleResolveBet(1)}
                    disabled={transactionPending}
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/40"
                  >
                    {transactionPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {betDetails.outcome1} Wins
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={() => handleResolveBet(2)}
                    disabled={transactionPending}
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/40"
                  >
                    {transactionPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {betDetails.outcome2} Wins
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={() => handleResolveBet(3)}
                    disabled={transactionPending}
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/40"
                  >
                    {transactionPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Draw (Split Funds)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            {canVoid && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800">
                <h3 className="text-base font-medium text-red-800 dark:text-red-300 mb-2">Void Bet</h3>
                <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                  As the resolver, you can void this bet. All funds will be returned to their original owners.
                </p>
                <Button 
                  onClick={handleVoidBet}
                  disabled={transactionPending}
                  variant="destructive"
                  className="w-full"
                >
                  {transactionPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Void Bet
                      <X className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {!canAccept && !canResolve && !canVoid && (
              <div className="bg-gray-50 dark:bg-dark-800 p-4 rounded-lg">
                <h3 className="text-base font-medium mb-2">No Available Actions</h3>
                <p className="text-sm text-dark-500 dark:text-dark-400">
                  {isCreator 
                    ? "As the creator, you are waiting for someone to accept your bet."
                    : isResolver 
                      ? betDetails.status === 0 
                        ? "As the resolver, you'll be able to resolve this bet once it's accepted."
                        : "As the resolver, you can't perform any actions on this bet in its current state."
                      : "You are not the creator, acceptor, or resolver of this bet, so you cannot perform any actions."}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}