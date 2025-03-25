import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWeb3 } from "@/hooks/useWeb3";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Cpu } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const formSchema = z.object({
  contractAddress: z.string().min(1, "Contract address is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface ContractInteractionProps {
  onContractLoad: (contract: any) => void;
}

export function ContractInteraction({ onContractLoad }: ContractInteractionProps) {
  const { isConnected, callMethod, executeMethod } = useWeb3();
  const { toast } = useToast();
  const [contractAddress, setContractAddress] = useState("");
  const [functionResults, setFunctionResults] = useState<Record<string, any>>({});
  const [functionInputs, setFunctionInputs] = useState<Record<string, string>>({});

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contractAddress: "",
    },
  });

  // Fetch contract details
  const { data: contract, isLoading } = useQuery({
    queryKey: contractAddress ? [`/api/contract/${contractAddress}`] : null,
    enabled: !!contractAddress,
  });

  const handleSearchContract = async (data: FormValues) => {
    try {
      setContractAddress(data.contractAddress);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch contract details",
        variant: "destructive",
      });
    }
  };

  const handleCallFunction = async (functionName: string, inputs: any[] = []) => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to interact with the contract",
        variant: "destructive",
      });
      return;
    }

    if (!contract) {
      toast({
        title: "No contract loaded",
        description: "Please load a contract first",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await callMethod(contract.address, contract.abi, functionName, inputs);
      setFunctionResults({
        ...functionResults,
        [functionName]: result ? result.toString() : "0",
      });
      
      toast({
        title: "Function called",
        description: `Successfully called ${functionName}()`,
      });
    } catch (error: any) {
      toast({
        title: "Error calling function",
        description: error.message || "Failed to call function",
        variant: "destructive",
      });
    }
  };

  const handleExecuteFunction = async (functionName: string, inputs: any[] = []) => {
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to interact with the contract",
        variant: "destructive",
      });
      return;
    }

    if (!contract) {
      toast({
        title: "No contract loaded",
        description: "Please load a contract first",
        variant: "destructive",
      });
      return;
    }

    try {
      await executeMethod(contract.address, contract.abi, functionName, inputs);
      
      toast({
        title: "Transaction submitted",
        description: `Successfully executed ${functionName}()`,
      });
    } catch (error: any) {
      toast({
        title: "Error executing function",
        description: error.message || "Failed to execute function",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (functionName: string, value: string) => {
    setFunctionInputs({
      ...functionInputs,
      [functionName]: value,
    });
  };

  // Determine if a function is read-only
  const isReadFunction = (item: any) => {
    return (
      item.stateMutability === "view" ||
      item.stateMutability === "pure" ||
      item.constant
    );
  };

  // Update parent component with loaded contract
  if (contract && !isLoading) {
    onContractLoad(contract);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4">Interact with Contract</h2>

        <div className="space-y-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSearchContract)} className="space-y-5">
              <FormField
                control={form.control}
                name="contractAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Address</FormLabel>
                    <div className="flex">
                      <FormControl>
                        <Input placeholder="0x..." className="text-dark-800 dark:text-white" {...field} />
                      </FormControl>
                      <Button
                        type="submit"
                        variant="secondary"
                        className="ml-2"
                        disabled={isLoading}
                      >
                        <Search className="h-5 w-5" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          {/* Contract Functions */}
          {contract && (
            <div className="border dark:border-dark-700 rounded-md">
              <div className="bg-dark-50 dark:bg-dark-900 px-4 py-3 rounded-t-md">
                <h3 className="text-sm font-medium">Contract Functions</h3>
              </div>
              
              <div className="p-4 space-y-4">
                {contract.abi
                  .filter((item: any) => item.type === "function")
                  .map((item: any, index: number) => {
                    const isRead = isReadFunction(item);
                    const functionName = item.name;
                    const inputFields = item.inputs || [];
                    
                    return (
                      <div
                        key={index}
                        className="border border-dark-200 dark:border-dark-700 rounded-md p-4"
                      >
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                          <span
                            className={`inline-block w-6 h-6 rounded-full text-xs flex items-center justify-center mr-2 ${
                              isRead
                                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                : "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                            }`}
                          >
                            {isRead ? "R" : "W"}
                          </span>
                          {functionName}({item.inputs?.map((input: any) => `${input.type} ${input.name}`).join(", ")})
                        </h4>
                        
                        {inputFields.length > 0 && (
                          <div className="mb-3 space-y-2">
                            {inputFields.map((input: any, i: number) => (
                              <Input
                                key={i}
                                placeholder={`${input.name} (${input.type})`}
                                value={functionInputs[`${functionName}_${i}`] || ""}
                                onChange={(e) =>
                                  handleInputChange(`${functionName}_${i}`, e.target.value)
                                }
                                className="text-sm text-dark-800 dark:text-white"
                              />
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant={isRead ? "secondary" : "default"}
                            className={isRead ? "bg-secondary" : "bg-primary"}
                            onClick={() => {
                              const inputs = inputFields.map((_, i) => 
                                functionInputs[`${functionName}_${i}`] || ""
                              );
                              if (isRead) {
                                handleCallFunction(functionName, inputs);
                              } else {
                                handleExecuteFunction(functionName, inputs);
                              }
                            }}
                          >
                            {isRead ? "Call" : "Write"}
                          </Button>
                          
                          {isRead && functionResults[functionName] !== undefined && (
                            <div className="text-sm text-dark-700 dark:text-gray-300">
                              Returns: <span className="font-mono text-dark-800 dark:text-white">{functionResults[functionName]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                {contract.abi.filter((item: any) => item.type === "function").length === 0 && (
                  <div className="text-center p-4 text-dark-700 dark:text-gray-300">
                    <Cpu className="h-12 w-12 mx-auto mb-2 text-dark-500 dark:text-gray-400" />
                    <p>No functions found in this contract</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
