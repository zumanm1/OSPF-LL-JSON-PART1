import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // CRITICAL FIX: Safe localStorage access with error handling and SSR safety
    if (typeof window === 'undefined') {
      return 'dark'; // Default for SSR
    }
    
    try {
      const savedTheme = localStorage.getItem('netviz_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }
    } catch (error) {
      console.warn('Error reading theme from localStorage, using default:', error);
      // Attempt to clear corrupted data
      try {
        localStorage.removeItem('netviz_theme');
      } catch (clearError) {
        console.error('Failed to clear corrupted theme data:', clearError);
      }
    }
    
    // Default to dark mode as per original design
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // CRITICAL FIX: Safe localStorage write with error handling
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('netviz_theme', theme);
      } catch (error) {
        console.warn('Error saving theme to localStorage:', error);
        // Gracefully continue without persistence
      }
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
