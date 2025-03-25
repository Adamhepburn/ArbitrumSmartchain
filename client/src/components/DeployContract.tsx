import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWeb3 } from "@/hooks/useWeb3";
import { useToast } from "@/hooks/use-toast";
import { getContractTemplate } from "@/lib/contractTemplates";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadCloud } from "lucide-react";

const formSchema = z.object({
  contractName: z.string().min(1, "Contract name is required"),
  contractSymbol: z.string().min(1, "Token symbol is required").max(5, "Symbol must be 5 characters or less"),
  initialSupply: z.string().refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    { message: "Initial supply must be a positive number" }
  ),
  contractType: z.string().min(1, "Contract type is required"),
  contractCode: z.string().optional(),
  constructorArgs: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DeployContractProps {
  onDeployStart: () => void;
  onDeployProgress: (step: number) => void;
  onDeployComplete: (contractAddress: string, transactionHash: string) => void;
  onDeployError: (error: Error) => void;
}

export function DeployContract({
  onDeployStart,
  onDeployProgress,
  onDeployComplete,
  onDeployError,
}: DeployContractProps) {
  const { deploy, isConnected, isArbitrumTestnet } = useWeb3();
  const { toast } = useToast();
  const [isDeploying, setIsDeploying] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contractName: "",
      contractSymbol: "",
      initialSupply: "1000000",
      contractType: "ERC20Token",
      contractCode: "",
      constructorArgs: "",
    },
  });

  const watchContractType = form.watch("contractType");

  // Update code when contract type changes
  const handleContractTypeChange = (value: string) => {
    form.setValue("contractType", value);
    
    try {
      const template = getContractTemplate(value);
      form.setValue("contractCode", template);
    } catch (error) {
      form.setValue("contractCode", "");
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!isConnected || !isArbitrumTestnet) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to Arbitrum Testnet",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeploying(true);
      onDeployStart();
      
      // Step 1: Validating contract
      onDeployProgress(1);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate validation delay
      
      // Step 2: Preparing transaction
      onDeployProgress(2);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate preparation delay
      
      // Step 3: Awaiting signature (handled by MetaMask)
      onDeployProgress(3);
      
      // Deploy the contract
      const result = await deploy(
        data.contractType,
        data.contractName,
        data.contractSymbol,
        data.initialSupply,
        data.contractType === "Custom Contract" ? data.contractCode : undefined
      );
      
      // Step 4: Deployment in progress
      onDeployProgress(4);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate deployment delay
      
      // Step 5: Confirmation
      onDeployProgress(5);
      
      onDeployComplete(result.address, result.hash);
      
      // Reset the form
      form.reset({
        contractName: "",
        contractSymbol: "",
        initialSupply: "1000000",
        contractType: "ERC20Token",
        contractCode: getContractTemplate("ERC20Token"),
        constructorArgs: "",
      });
    } catch (error: any) {
      console.error("Error deploying contract:", error);
      onDeployError(error);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold mb-4">Deploy Smart Contract</h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="contractName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Name</FormLabel>
                  <FormControl>
                    <Input placeholder="MyToken" className="text-dark-800 dark:text-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractSymbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token Symbol</FormLabel>
                  <FormControl>
                    <Input placeholder="MTK" className="text-dark-800 dark:text-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialSupply"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Supply</FormLabel>
                  <FormControl>
                    <Input placeholder="1000000" className="text-dark-800 dark:text-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Type</FormLabel>
                  <Select
                    onValueChange={handleContractTypeChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select contract type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ERC20Token">ERC20 Token</SelectItem>
                      <SelectItem value="SimpleStorage">Simple Storage</SelectItem>
                      <SelectItem value="Custom Contract">Custom Contract</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchContractType === "Custom Contract" && (
              <FormField
                control={form.control}
                name="contractCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Code</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={6}
                        className="font-mono text-sm"
                        placeholder="// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MyContract {
    // Your code here
}"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="constructorArgs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Constructor Arguments
                    <span className="text-dark-500 text-xs ml-1">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="[arg1, arg2, ...]" className="text-dark-800 dark:text-white" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-600"
                disabled={isDeploying || !isConnected || !isArbitrumTestnet}
              >
                <UploadCloud className="h-5 w-5 mr-2" />
                {isDeploying ? "Deploying..." : "Deploy Contract"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
