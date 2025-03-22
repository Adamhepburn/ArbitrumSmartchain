import { useState, useEffect } from "react";

export function useTheme() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Check for saved preference
    const savedPreference = localStorage.getItem("theme");
    if (savedPreference) {
      return savedPreference === "dark";
    }
    // If no saved preference, use system preference
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    // Update class on document.documentElement
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    // Save preference to localStorage
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Toggle theme function
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return { darkMode, toggleTheme };
}
