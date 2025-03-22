import { ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-dark-800 px-4 sm:px-6 lg:px-8 py-4 border-t border-dark-200 dark:border-dark-700">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-3 md:mb-0">
          <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.7 6.3L12.7 2.3C12.3 2.1 11.7 2.1 11.3 2.3L4.3 6.3C3.9 6.5 3.7 6.9 3.7 7.3V16.7C3.7 17.1 3.9 17.5 4.3 17.7L11.3 21.7C11.7 21.9 12.3 21.9 12.7 21.7L19.7 17.7C20.1 17.5 20.3 17.1 20.3 16.7V7.3C20.3 6.9 20.1 6.5 19.7 6.3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3.9 6.6L12 11.5L20.1 6.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 11.5V21.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="ml-2 text-sm text-dark-600 dark:text-dark-400">Arbitrum Smart Contract Deployer</span>
        </div>
        <div className="flex space-x-4">
          <a href="https://docs.arbitrum.io/developers" target="_blank" rel="noopener noreferrer" className="text-sm text-dark-600 dark:text-dark-400 hover:text-primary flex items-center">
            Documentation
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
          <a href="https://github.com/OffchainLabs/arbitrum" target="_blank" rel="noopener noreferrer" className="text-sm text-dark-600 dark:text-dark-400 hover:text-primary flex items-center">
            GitHub
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
          <a href="https://discord.gg/arbitrum" target="_blank" rel="noopener noreferrer" className="text-sm text-dark-600 dark:text-dark-400 hover:text-primary flex items-center">
            Support
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </div>
      </div>
    </footer>
  );
}
