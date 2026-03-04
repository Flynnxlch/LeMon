import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(() => {
    const stored = localStorage.getItem('userPreferences');
    return stored ? JSON.parse(stored) : {
      compactMode: false,
      showWelcome: true,
      animationsEnabled: true
    };
  });

  // Enforce light mode for modern minimalist aesthetic
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    localStorage.setItem('darkMode', JSON.stringify(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('userPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferences = useCallback((updates) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const value = useMemo(
    () => ({ preferences, updatePreferences }),
    [preferences, updatePreferences]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
