import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Copy, AlertCircle, Check, Key, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const accessWalletSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

type AccessWalletFormValues = z.infer<typeof accessWalletSchema>;

export function WalletManager() {
  const { user, decryptWalletMutation } = useAuth();
  const [privateKeyVisible, setPrivateKeyVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<AccessWalletFormValues>({
    resolver: zodResolver(accessWalletSchema),
    defaultValues: {
      password: "",
    },
  });
  
  const onSubmit = (data: AccessWalletFormValues) => {
    if (!user) return;
    
    decryptWalletMutation.mutate({
      username: user.username,
      password: data.password
    });
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "The information has been copied to your clipboard.",
      });
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    });
  };

  const togglePrivateKeyVisibility = () => {
    setPrivateKeyVisible(!privateKeyVisible);
  };
  
  if (!user) {
    return null;
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wallet className="mr-2 h-5 w-5" />
          Wallet Manager
        </CardTitle>
        <CardDescription>
          Access and manage your blockchain wallet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="wallet-address">Wallet Address</Label>
            <div className="flex mt-1">
              <Input 
                id="wallet-address" 
                value={user.walletAddress || ""} 
                readOnly 
                className="flex-1"
              />
              <Button 
                variant="outline" 
                className="ml-2" 
                onClick={() => copyToClipboard(user.walletAddress || "")}
                disabled={!user.walletAddress}
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {user.walletAddress && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" className="w-full">
                  <Key className="mr-2 h-4 w-4" />
                  Access Private Key
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Access Wallet</DialogTitle>
                  <DialogDescription>
                    Enter your password to access your wallet's private key.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter your password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Warning</AlertTitle>
                      <AlertDescription>
                        Never share your private key with anyone. Anyone with your private key has full control of your wallet.
                      </AlertDescription>
                    </Alert>
                    
                    {decryptWalletMutation.data && (
                      <div className="space-y-2">
                        <Label htmlFor="private-key">Private Key</Label>
                        <div className="relative">
                          <Input
                            id="private-key"
                            type={privateKeyVisible ? "text" : "password"}
                            value={decryptWalletMutation.data.privateKey}
                            readOnly
                            className="pr-20"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-10 top-0 h-full px-2"
                            onClick={togglePrivateKeyVisibility}
                          >
                            {privateKeyVisible ? "Hide" : "Show"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-2"
                            onClick={() => copyToClipboard(decryptWalletMutation.data.privateKey)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <DialogFooter className="sm:justify-start">
                      <Button 
                        type="submit" 
                        disabled={decryptWalletMutation.isPending}
                      >
                        {decryptWalletMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>Access Private Key</>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}