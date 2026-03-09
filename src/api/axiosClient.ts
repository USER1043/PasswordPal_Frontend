// ============================================================================
// HTTP client for communicating with the backend API
// Handles token refresh, session revocation, and sensitive data wiping
// ============================================================================
import axios from "axios";
import { invoke } from "@tauri-apps/api/core";

export const SESSION_REVOKED_EVENT = "session-revoked";

const apiClient = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true,
});

/** Wipe encryption keys from Rust memory */
export const wipe_sensitive_data = async () => {
  try {
    await invoke("lock_vault");
  } catch (error) {
    console.error("Failed to wipe sensitive data:", error);
  }
};

let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

function onRefreshed(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh the refresh call itself
      if (originalRequest.url?.includes("/auth/refresh") ||
        originalRequest.url?.includes("/auth/login") ||
        originalRequest.url?.includes("/auth/register")) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          await axios.post("http://localhost:3000/auth/refresh", null, {
            withCredentials: true,
          });
          isRefreshing = false;
          onRefreshed(true);
          // Retry original request
          return apiClient(originalRequest);
        } catch {
          isRefreshing = false;
          onRefreshed(false);

          // Refresh failed — wipe and redirect
          await wipe_sensitive_data();
          const event = new CustomEvent(SESSION_REVOKED_EVENT, {
            detail: {
              message:
                "Your session has expired. Please log in again.",
            },
          });
          window.dispatchEvent(event);
          return Promise.reject(error);
        }
      } else {
        // Another refresh is in progress — wait for it
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((success: boolean) => {
            if (success) {
              resolve(apiClient(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
