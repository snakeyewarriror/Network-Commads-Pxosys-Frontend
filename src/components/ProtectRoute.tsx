import { Navigate } from "react-router";
import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { checkAndRefreshToken, clearTokens } from "../utils/authUtils";

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const authorize = async () => {
      const authorized = await checkAndRefreshToken();
      setIsAuthorized(authorized);
      if (!authorized) {
        clearTokens(); // Ensure tokens are cleared if checkAndRefreshToken fails
      }
    };

    authorize().catch(error => {
      console.error("Error during authorization check:", error);
      setIsAuthorized(false);
      clearTokens();
    });
  }, []);

  if (isAuthorized === null) {
    return <div>Loading authentication...</div>; // More specific loading message
  }

  return isAuthorized ? children : <Navigate to="/portal/admin-entry" replace />;
}

export default ProtectedRoute;