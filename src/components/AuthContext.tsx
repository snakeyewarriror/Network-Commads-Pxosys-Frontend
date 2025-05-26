import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkAndRefreshToken, clearTokens } from '../utils/authUtils';
import { ACCESS_TOKEN } from '../../constants';

interface AuthContextType {
  isAuthenticated: boolean | null; // null for initial loading, false for unauthenticated, true for authenticated
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean | null>>;
  checkAuthStatus: () => Promise<void>; // Function to manually trigger auth check
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Function to perform the authentication check
  const checkAuthStatus = useCallback(async () => {
    const authStatus = await checkAndRefreshToken();
    setIsAuthenticated(authStatus);
    if (!authStatus) {
      clearTokens(); // Ensure tokens are cleared if checkAndRefreshToken indicates failure
    }
  }, []); // useCallback memoizes the function

  // Initial check on component mount
  useEffect(() => {
    checkAuthStatus();

    const handleStorageChange = () => {
      const token = localStorage.getItem(ACCESS_TOKEN);
      if (isAuthenticated === null || isAuthenticated !== (!!token)) { // Only re-check if status *might* have changed
        checkAuthStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAuthStatus]); // Re-run if checkAuthStatus changes (it won't because of useCallback)

  const value = {
    isAuthenticated,
    setIsAuthenticated, // Useful for login/logout components to directly update state
    checkAuthStatus,    // Useful for components that need to force a re-check
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to consume the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};