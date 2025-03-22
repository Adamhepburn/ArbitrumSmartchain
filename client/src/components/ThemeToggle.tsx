import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <div className="fixed top-4 right-4 z-20">
      <Button 
        variant="outline" 
        size="icon" 
        onClick={toggleTheme} 
        className="rounded-full bg-white dark:bg-dark-800 shadow-md dark:shadow-dark-700/20"
      >
        {darkMode ? (
          <Sun className="h-5 w-5 text-yellow-300" />
        ) : (
          <Moon className="h-5 w-5 text-dark-500" />
        )}
        <span className="sr-only">Toggle theme</span>
      </Button>
    </div>
  );
}
