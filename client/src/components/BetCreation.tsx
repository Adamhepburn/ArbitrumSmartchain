import { useState } from "react";
import { useWeb3 } from "@/hooks/useWeb3";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  ArrowLeft, 
  DollarSign, 
  Calendar, 
  Award, 
  Timer, 
  Target, 
  Check, 
  Loader2 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Define step indicators
const betCreationSteps = [
  { 
    id: "details", 
    title: "Bet Details", 
    description: "What are you betting on?",
    icon: Target 
  },
  { 
    id: "conditions", 
    title: "Bet Conditions", 
    description: "Set the terms of the bet",
    icon: Timer 
  },
  { 
    id: "amount", 
    title: "Stake Amount", 
    description: "How much do you want to bet?",
    icon: DollarSign 
  },
  { 
    id: "summary", 
    title: "Review", 
    description: "Confirm your bet details",
    icon: Award 
  },
  { 
    id: "create", 
    title: "Create Bet", 
    description: "Deploy bet to the blockchain",
    icon: Check 
  },
];

// Step 1: Bet Details form schema
const betDetailsSchema = z.object({
  title: z.string().min(3, {
    message: "Bet title must be at least 3 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  category: z.string({
    required_error: "Please select a category.",
  }),
});

// Step 2: Bet Conditions form schema
const betConditionsSchema = z.object({
  outcome1: z.string().min(2, {
    message: "Outcome must be at least 2 characters.",
  }),
  outcome2: z.string().min(2, {
    message: "Outcome must be at least 2 characters.",
  }),
  endDate: z.string({
    required_error: "Please select an end date.",
  }),
  resolver: z.string().min(42, {
    message: "Please enter a valid wallet address.",
  }).optional(),
});

// Step 3: Stake Amount form schema
const stakeAmountSchema = z.object({
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "Please enter a valid amount greater than 0.",
  }),
});

// Combined schema for all steps
const betCreationSchema = betDetailsSchema
  .merge(betConditionsSchema)
  .merge(stakeAmountSchema);

// Type for our form values
type BetFormValues = z.infer<typeof betCreationSchema>;

interface BetCreationProps {
  onBetCreationStart: () => void;
  onBetCreationProgress: (step: number) => void;
  onBetCreationComplete: (betAddress: string, transactionHash: string) => void;
  onBetCreationError: (error: Error) => void;
}

export function BetCreation({
  onBetCreationStart,
  onBetCreationProgress,
  onBetCreationComplete,
  onBetCreationError,
}: BetCreationProps) {
  const { isConnected, account, deploy } = useWeb3();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  
  // Default form values
  const defaultValues: Partial<BetFormValues> = {
    title: "",
    description: "",
    category: "",
    outcome1: "",
    outcome2: "",
    endDate: "",
    amount: "",
    resolver: "",
  };

  // Initialize form
  const form = useForm<BetFormValues>({
    resolver: zodResolver(betCreationSchema),
    defaultValues,
    mode: "onChange",
  });

  // Function to handle next step
  const handleNextStep = async () => {
    // Validate current step fields
    let isValid = false;
    
    switch (currentStep) {
      case 0: // Details
        isValid = await form.trigger(["title", "description", "category"]);
        break;
      case 1: // Conditions
        isValid = await form.trigger(["outcome1", "outcome2", "endDate"]);
        break;
      case 2: // Amount
        isValid = await form.trigger(["amount"]);
        break;
      default:
        isValid = true;
    }
    
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, betCreationSteps.length - 1));
      onBetCreationProgress(currentStep + 1);
    }
  };

  // Function to handle previous step
  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
    onBetCreationProgress(currentStep - 1);
  };

  // Function to handle final submission
  const onSubmit = async (data: BetFormValues) => {
    if (!isConnected) {
      onBetCreationError(new Error("Please connect your wallet first"));
      return;
    }
    
    try {
      setIsCreating(true);
      onBetCreationStart();
      
      // Create the bet contract
      const result = await deploy(
        "BettingContract",
        data.title,
        undefined,
        data.amount,
        // Custom parameters for the bet contract
        JSON.stringify({
          description: data.description,
          category: data.category,
          outcome1: data.outcome1,
          outcome2: data.outcome2,
          endDate: data.endDate,
          resolver: data.resolver || account,
        })
      );
      
      onBetCreationComplete(result.address, result.hash);
      
      // Reset form and go back to first step
      form.reset(defaultValues);
      setCurrentStep(0);
      
    } catch (error: any) {
      onBetCreationError(error);
    } finally {
      setIsCreating(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2 
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Card transition
  const cardVariants = {
    hidden: { opacity: 0, x: 100 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -100, transition: { duration: 0.3 } }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // Bet Details
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bet Title</FormLabel>
                    <FormControl>
                      <Input placeholder="What's your bet about?" {...field} />
                    </FormControl>
                    <FormDescription>
                      Create a clear and concise title for your bet.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the details of your bet..." 
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Provide enough details so others understand the bet completely.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="politics">Politics</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="crypto">Crypto</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select a category to help others find your bet.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
          </motion.div>
        );
      
      case 1:
        // Bet Conditions
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="outcome1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcome 1</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Team A wins" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="outcome2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcome 2</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Team B wins" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolution Date</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>
                      When will this bet be resolved? Choose a date and time.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="resolver"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolver Address (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="0x... (Leave empty to use your address)" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Address of the trusted third party who will resolve the bet. 
                      If left empty, you'll be the resolver.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
          </motion.div>
        );
      
      case 2:
        // Stake Amount
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <motion.div variants={itemVariants} className="space-y-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stake Amount (ETH)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
                        <Input 
                          type="number"
                          min="0.001"
                          step="0.001"
                          placeholder="0.05"
                          className="pl-9"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      How much ETH are you willing to stake on this bet?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="rounded-lg bg-gray-100 dark:bg-dark-800 p-4 mt-4">
                <h4 className="text-sm font-medium mb-2">Important Information</h4>
                <p className="text-sm text-dark-500 dark:text-dark-400">
                  This amount will be locked in the smart contract until the bet is resolved.
                  The other party will need to match this amount to accept the bet.
                </p>
              </div>
            </motion.div>
          </motion.div>
        );
      
      case 3:
        // Review
        const formValues = form.getValues();
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <motion.div variants={itemVariants}>
              <div className="rounded-lg bg-gray-100 dark:bg-dark-800 p-4">
                <h3 className="font-medium text-lg">{formValues.title}</h3>
                <Badge className="mt-2">{formValues.category}</Badge>
                <p className="mt-3 text-sm text-dark-600 dark:text-dark-400">
                  {formValues.description}
                </p>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">Outcome 1</h4>
                    <p className="text-sm text-dark-600 dark:text-dark-400">{formValues.outcome1}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">Outcome 2</h4>
                    <p className="text-sm text-dark-600 dark:text-dark-400">{formValues.outcome2}</p>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Resolution Date:</span>
                    <span className="text-sm font-medium">
                      {new Date(formValues.endDate).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Stake Amount:</span>
                    <span className="text-sm font-medium">{formValues.amount} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Resolver:</span>
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {formValues.resolver || account}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4 border border-yellow-200 dark:border-yellow-800">
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex items-center">
                  <Timer className="h-4 w-4 mr-2" />
                  Ready to Create
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Once you create this bet, it will be deployed to the blockchain and 
                  your stake amount will be locked in the contract. Continue to deploy
                  the bet on the Arbitrum testnet.
                </p>
              </div>
            </motion.div>
          </motion.div>
        );
      
      case 4:
        // Create
        return (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-4 flex flex-col items-center text-center p-4"
          >
            <motion.div variants={itemVariants}>
              {isCreating ? (
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
              ) : (
                <Check className="h-16 w-16 text-green-500 mb-4" />
              )}
            </motion.div>
            
            <motion.h3 variants={itemVariants} className="text-xl font-bold">
              {isCreating ? "Creating Your Bet..." : "Ready to Create Bet"}
            </motion.h3>
            
            <motion.p variants={itemVariants} className="text-dark-500 dark:text-dark-400">
              {isCreating 
                ? "Please confirm the transaction in your wallet. This may take a moment."
                : "Click the button below to deploy your bet to the blockchain."}
            </motion.p>
          </motion.div>
        );
      
      default:
        return null;
    }
  };

  return (
    <Card className="w-full shadow-md">
      <CardHeader className="pb-4">
        <CardTitle>Create a New Bet</CardTitle>
        <div className="mt-4">
          <div className="flex justify-between relative">
            {betCreationSteps.map((step, index) => (
              <div 
                key={step.id} 
                className={`flex flex-col items-center relative z-10 ${
                  index <= currentStep ? "text-primary" : "text-dark-400"
                }`}
              >
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    index < currentStep 
                      ? "bg-primary border-primary text-white"
                      : index === currentStep
                        ? "border-primary bg-white dark:bg-dark-900 text-primary"
                        : "border-dark-200 dark:border-dark-700 text-dark-400 bg-white dark:bg-dark-900"
                  }`}
                >
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <div className="text-xs mt-1 font-medium">{step.title}</div>
                
                {/* Progress line */}
                {index < betCreationSteps.length - 1 && (
                  <div className="absolute top-5 left-[50px] w-[calc(100%-20px)] h-0.5 bg-dark-200 dark:bg-dark-700">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: index < currentStep ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="pt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="min-h-[300px]"
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </CardContent>
          
          <CardFooter className="flex justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handlePrevStep}
              disabled={currentStep === 0 || isCreating}
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            {currentStep < betCreationSteps.length - 1 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="flex items-center"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="submit"
                disabled={isCreating}
                className="flex items-center"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Bet
                    <Check className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}