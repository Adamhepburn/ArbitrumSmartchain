import { Badge } from "@/components/ui/badge";

interface NetworkBadgeProps {
  networkName: string | null;
  isConnected: boolean;
  isNetworkSupported: boolean;
}

export function NetworkBadge({ networkName, isConnected, isNetworkSupported }: NetworkBadgeProps) {
  if (!isConnected || !isNetworkSupported) {
    return null;
  }

  return (
    <div className="flex items-center">
      <Badge variant="outline" className="bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-100 border-primary-200 dark:border-primary-800">
        <span className="w-2 h-2 bg-primary rounded-full mr-1.5"></span>
        <span>{networkName}</span>
      </Badge>
    </div>
  );
}
