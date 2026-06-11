import React, { createContext, useContext, useEffect, useState } from 'react';

// Quản lý light/dark mode toàn app. Lưu lựa chọn vào localStorage,
// đồng thời set data-theme trên <html> để CSS variables (theme.css) đổi theo.
const ThemeContext = createContext({ isDark: false, toggleTheme: () => {} });

export const AppThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('app-theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('app-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
