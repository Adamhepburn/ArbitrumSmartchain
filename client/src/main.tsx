import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Polyfill window.ethereum for type safety
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (request: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, listener: (...args: any[]) => void) => void;
      removeListener: (eventName: string, listener: (...args: any[]) => void) => void;
    };
  }
}

createRoot(document.getElementById("root")!).render(<App />);
