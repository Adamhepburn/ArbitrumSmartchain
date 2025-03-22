import { Card, CardContent } from "@/components/ui/card";

interface DeploymentStep {
  id: number;
  title: string;
  description: string;
}

const deploymentSteps: DeploymentStep[] = [
  {
    id: 1,
    title: "Validating Contract",
    description: "Code compilation and verification",
  },
  {
    id: 2,
    title: "Preparing Transaction",
    description: "Configuring deployment parameters",
  },
  {
    id: 3,
    title: "Awaiting Signature",
    description: "Confirm in MetaMask wallet",
  },
  {
    id: 4,
    title: "Deployment in Progress",
    description: "Contract is being deployed",
  },
  {
    id: 5,
    title: "Confirmation",
    description: "Contract successfully deployed",
  },
];

interface DeploymentStatusProps {
  currentStep: number;
  gasPrice?: string;
  gasLimit?: string;
  maxFee?: string;
}

export function DeploymentStatus({
  currentStep,
  gasPrice = "0.1 Gwei",
  gasLimit = "1,250,000",
  maxFee = "~0.000125 ETH",
}: DeploymentStatusProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4">Deployment Status</h2>

        <div className="space-y-5">
          {/* Deployment Steps */}
          <div className="relative">
            {deploymentSteps.map((step) => (
              <div key={step.id} className="flex items-start mb-6">
                <div className="flex items-center h-6 mr-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      step.id <= currentStep
                        ? "bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-100"
                        : "bg-dark-100 dark:bg-dark-700 text-dark-500 dark:text-dark-400"
                    }`}
                  >
                    {step.id}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium">{step.title}</h3>
                  <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}

            {/* Connecting Line */}
            <div className="absolute top-3 left-3 h-[calc(100%-24px)] w-px bg-dark-200 dark:bg-dark-700"></div>
          </div>

          {/* Gas Estimates */}
          <div className="bg-dark-50 dark:bg-dark-900 rounded-md p-4">
            <h3 className="text-sm font-medium mb-2">Estimated Gas</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Gas Price:</div>
              <div className="text-right font-mono">{gasPrice}</div>
              <div>Gas Limit:</div>
              <div className="text-right font-mono">{gasLimit}</div>
              <div>Max Fee:</div>
              <div className="text-right font-mono">{maxFee}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
