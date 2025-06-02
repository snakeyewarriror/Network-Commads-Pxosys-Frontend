import axios from "axios";
import { ACCESS_TOKEN } from "../constants";
import { checkAndRefreshToken, clearTokens } from "./utils/authUtils"; // Import the utility function


const is_development = import.meta.env.MODE === 'development';
const base_url = is_development ? import.meta.env.VITE_API_URL_LOCAL : import.meta.env.VITE_API_URL_DEPLOYMENT

// Create the Axios instance
const api = axios.create({
  baseURL: base_url,
});

// Request Interceptor: Attach Access Token to Headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Token Refresh on 401 Errors
let isRefreshing = false; // Flag to prevent multiple refresh calls simultaneously
let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void }> = []; // Queue for failed requests

// Helper function to process the queue once refresh is done
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token); // Resolve with a dummy value to let the original request retry
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    return response; // Successful response, just pass it through
  },
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 (Unauthorized) and it's not the refresh request itself
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Set a flag to prevent infinite loops if the refresh token is also invalid
      originalRequest._retry = true;

      // If a refresh is already in progress, add the original request to a queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          // Once the refresh is done, retry the original request with the new token
          // The request interceptor will automatically add the new token
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err); // If refresh failed, reject the original request
        });
      }

      isRefreshing = true; // Mark refresh as in progress

      try {
        const refreshed = await checkAndRefreshToken(); // Attempt to refresh the token
        if (refreshed) {
          // Refresh was successful, retry all queued requests
          processQueue(null, localStorage.getItem(ACCESS_TOKEN) || undefined);
          // Retry the original request
          return api(originalRequest);
        } else {
          // Refresh failed, clear tokens and redirect to login
          processQueue(error); // Reject all queued requests
          clearTokens();
          window.location.href = '/portal/admin-entry'; // Redirect to login page
          return Promise.reject(error); // Reject the original failed request
        }
      } catch (refreshError) {
        // Handle error during refresh process itself
        console.error("Refresh token process failed:", refreshError);
        processQueue(refreshError as Error); // Reject all queued requests
        clearTokens();
        window.location.href = '/portal/admin-entry'; // Redirect to login page
        return Promise.reject(refreshError); // Reject the original failed request
      } finally {
        isRefreshing = false; // Reset refresh flag
      }
    }

    // For any other error (not 401 or not a retryable 401), just reject
    return Promise.reject(error);
  }
);

export default api;