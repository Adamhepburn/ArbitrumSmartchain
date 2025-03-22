import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

interface ContractInfoProps {
  contract: {
    name: string;
    address: string;
    deployedAtBlock?: number;
    network: string;
  } | null;
}

export function ContractInfo({ contract }: ContractInfoProps) {
  if (!contract) {
    return (
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Contract Info</h2>
          <p className="text-dark-500 dark:text-dark-400 text-sm">
            No contract selected. Enter a contract address to view details.
          </p>
        </CardContent>
      </Card>
    );
  }

  const explorerUrl = 
    contract.network === "Arbitrum Sepolia" 
      ? `https://sepolia.arbiscan.io/address/${contract.address}`
      : `https://arbiscan.io/address/${contract.address}`;

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4">Contract Info</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm text-dark-500 dark:text-dark-400">Contract Name</h3>
            <p className="font-medium">{contract.name}</p>
          </div>

          <div>
            <h3 className="text-sm text-dark-500 dark:text-dark-400">Deployed At</h3>
            <p className="font-medium">{contract.address}</p>
          </div>

          {contract.deployedAtBlock && (
            <div>
              <h3 className="text-sm text-dark-500 dark:text-dark-400">Deployment Block</h3>
              <p className="font-medium">{contract.deployedAtBlock.toLocaleString()}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm text-dark-500 dark:text-dark-400">Network</h3>
            <p className="font-medium">{contract.network}</p>
          </div>

          <div className="pt-2">
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:text-primary-600 flex items-center"
            >
              View on Arbiscan
              <ExternalLink className="h-4 w-4 ml-1" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
