import { useState } from "react";
import { useWeb3 } from "@/hooks/useWeb3";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, ChevronDown, CheckCircle, XCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export function TransactionHistory() {
  const { account, isConnected } = useWeb3();
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  // Fetch transactions for the connected account
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: account ? [`/api/transactions/${account}`] : null,
    enabled: !!account && isConnected,
  });

  const toggleTransaction = (txHash: string) => {
    if (expandedTx === txHash) {
      setExpandedTx(null);
    } else {
      setExpandedTx(txHash);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "success") {
      return <CheckCircle className="h-4 w-4 text-success-600 dark:text-success-400" />;
    } else if (status === "pending") {
      return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
    } else {
      return <XCircle className="h-4 w-4 text-error-600 dark:text-error-400" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    if (status === "success") {
      return "bg-success-100 dark:bg-success-900 text-success-800 dark:text-success-200";
    } else if (status === "pending") {
      return "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200";
    } else {
      return "bg-error-100 dark:bg-error-900 text-error-800 dark:text-error-200";
    }
  };

  const getExplorerUrl = (hash: string, network: string) => {
    if (network === "Arbitrum Sepolia") {
      return `https://sepolia.arbiscan.io/tx/${hash}`;
    }
    return `https://arbiscan.io/tx/${hash}`;
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return format(date, "PPp");
    } catch (error) {
      return "Unknown time";
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4">Transaction History</h2>

        {isLoading ? (
          <div className="text-center py-6">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-2 text-sm text-dark-500 dark:text-dark-400">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-dark-500 dark:text-dark-400">No transactions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx: any) => (
              <div
                key={tx.hash}
                className="border border-dark-200 dark:border-dark-700 rounded-lg overflow-hidden"
              >
                <div
                  onClick={() => toggleTransaction(tx.hash)}
                  className="bg-dark-50 dark:bg-dark-800 p-4 flex justify-between items-center cursor-pointer"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-success-100 dark:bg-success-900 flex items-center justify-center mr-3">
                      {getStatusIcon(tx.status)}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {tx.type === "deploy"
                          ? "Contract Deployment"
                          : `Method Call: ${tx.method || "unknown"}()`}
                      </div>
                      <div className="text-xs text-dark-500 dark:text-dark-400">
                        {tx.contractAddress ? tx.contractAddress.substring(0, 8) + "..." : "Contract"} • {formatTimeAgo(tx.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${getStatusBadgeColor(
                        tx.status
                      )}`}
                    >
                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-dark-400 transition-transform ${
                        expandedTx === tx.hash ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>

                {expandedTx === tx.hash && (
                  <div className="p-4 border-t border-dark-200 dark:border-dark-700 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-dark-500 dark:text-dark-400 mb-1">Transaction Hash</div>
                        <div className="font-mono break-all">{tx.hash}</div>
                      </div>
                      <div>
                        <div className="text-dark-500 dark:text-dark-400 mb-1">Contract Address</div>
                        <div className="font-mono">{tx.contractAddress || "N/A"}</div>
                      </div>
                      <div>
                        <div className="text-dark-500 dark:text-dark-400 mb-1">Block</div>
                        <div>{tx.blockNumber || "Pending"}</div>
                      </div>
                      
                      {tx.method && (
                        <div>
                          <div className="text-dark-500 dark:text-dark-400 mb-1">Method</div>
                          <div className="font-mono">{tx.method}</div>
                        </div>
                      )}
                      
                      {tx.gasUsed && (
                        <div>
                          <div className="text-dark-500 dark:text-dark-400 mb-1">Gas Used</div>
                          <div>{tx.gasUsed}</div>
                        </div>
                      )}
                      
                      {tx.gasPrice && (
                        <div>
                          <div className="text-dark-500 dark:text-dark-400 mb-1">Gas Price</div>
                          <div>{tx.gasPrice} Gwei</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <a
                        href={getExplorerUrl(tx.hash, tx.network)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:text-primary-600 flex items-center"
                      >
                        View on Arbiscan
                        <ExternalLink className="h-4 w-4 ml-1" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
