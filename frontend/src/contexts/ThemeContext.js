import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Get saved theme from localStorage (or default to 'light')
    const savedTheme = localStorage.getItem('theme') || 'light';
    return savedTheme;
  });

  // Update theme class on document root when theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    // Remove dark class first
    root.classList.remove('dark');
    // Add dark class if theme is dark
    if (theme === 'dark') {
      root.classList.add('dark');
    }
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

