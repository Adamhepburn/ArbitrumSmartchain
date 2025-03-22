import { WalletConnect } from "@/components/WalletConnect";

export function Header() {
  return (
    <header className="bg-white dark:bg-dark-800 shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.7 6.3L12.7 2.3C12.3 2.1 11.7 2.1 11.3 2.3L4.3 6.3C3.9 6.5 3.7 6.9 3.7 7.3V16.7C3.7 17.1 3.9 17.5 4.3 17.7L11.3 21.7C11.7 21.9 12.3 21.9 12.7 21.7L19.7 17.7C20.1 17.5 20.3 17.1 20.3 16.7V7.3C20.3 6.9 20.1 6.5 19.7 6.3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3.9 6.6L12 11.5L20.1 6.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 11.5V21.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="ml-3 text-xl font-semibold">Arbitrum Smart Contract Deployer</h1>
          </div>
          
          <WalletConnect />
        </div>
      </div>
    </header>
  );
}
