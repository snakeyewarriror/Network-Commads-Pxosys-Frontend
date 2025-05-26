import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { REFRESH_TOKEN, ACCESS_TOKEN } from "../../constants";


const is_development = import.meta.env.MODE === 'development';

const AUTH_API_URL = is_development ? import.meta.env.VITE_API_URL_LOCAL : import.meta.env.VITE_API_URL_DEPLOYMENT;

interface DecodedToken {
  exp?: number;
}

/**
 * Checks if the current access token is valid and attempts to refresh it if expired.
 * @returns {Promise<boolean>} True if an authorized access token is available, false otherwise.
 */
export const checkAndRefreshToken = async (): Promise<boolean> => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN);

  // 1. No access token at all
  if (!accessToken) {
    // If there's a refresh token but no access token, try to get a new access token
    if (refreshToken) {
      return await performTokenRefresh(refreshToken);
    }
    return false; // No tokens at all
  }

  // 2. Access token exists, check its expiry
  try {
    const decoded: DecodedToken = jwtDecode(accessToken);
    const tokenExp = decoded.exp;
    const currentTime = Math.floor(Date.now() / 1000);

    if (typeof tokenExp !== "number") {
      // Token is malformed or missing expiry, treat as unauthorized
      console.warn("Access token malformed or missing expiry.");
      return false; // Or try to refresh if you deem it recoverable
    }

    // 3. Access token is expired
    if (tokenExp < currentTime) {
      if (refreshToken) {
        return await performTokenRefresh(refreshToken);
      }
      else {
        return false;
      }
    } else {
      // 4. Access token is still valid
      return true;
    }
  }
  catch (error) {
    // Decoding failed (e.g., malformed token)
    console.error("Error decoding access token:", error);
    // If decoding fails, it's likely a bad token, try to refresh if refresh token exists
    if (refreshToken) {
      return await performTokenRefresh(refreshToken);
    }
    return false;
  }
};

/**
 * Performs the actual API call to refresh the token.
 * @param {string} refreshToken The refresh token.
 * @returns {Promise<boolean>} True if refresh was successful, false otherwise.
 */
const performTokenRefresh = async (refreshToken: string): Promise<boolean> => {
  try {
    const response = await axios.post(`${AUTH_API_URL}/refresh`, { token: refreshToken }); // Use axios directly
    if (response.status === 200) {
      localStorage.setItem(ACCESS_TOKEN, response.data.access);
      return true;
    }
    else {
      console.error("Token refresh failed with status:", response.status);
      // Clear tokens if refresh failed, as they are likely invalid
      localStorage.removeItem(ACCESS_TOKEN);
      localStorage.removeItem(REFRESH_TOKEN);
      return false;
    }
  }
  catch (error) {
    console.error("Error during token refresh API call:", error);
    // Clear tokens if refresh failed due to network error or server error
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    return false;
  }
};

/**
 * Removes all tokens from local storage.
 */
export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN);
  localStorage.removeItem(REFRESH_TOKEN);
};