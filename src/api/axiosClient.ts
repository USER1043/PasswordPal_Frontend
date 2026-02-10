// HTTP client for communicating with the backend API
// Handles authentication cookies and session revocation
import axios from "axios";
import { invoke } from "@tauri-apps/api/core";

// Custom event dispatched when session is revoked (e.g., password changed on another device)
export const SESSION_REVOKED_EVENT = "session-revoked";

// Create axios instance configured for our backend
const apiClient = axios.create({
  baseURL: "http://localhost:3000", // Replace with actual API URL or config
  withCredentials: true,
});


// Securely wipes encryption keys from memory when user logs out or session expires
export const wipe_sensitive_data = async () => {
  try {
    console.log("Wiping sensitive data from RAM...");
    // Call the Rust command to lock and wipe the vault from memory
    await invoke("lock_vault");
    // Clear any frontend sensitive state if present (localStorage/sessionStorage usually shouldn't hold secrets, but wipe tokens if needed)
    // localStorage.removeItem('token'); // usage depends on auth implementation
    console.log("Sensitive data wiped.");
  } catch (error) {
    console.error("Failed to wipe sensitive data:", error);
  }
};


// Intercept API responses to handle session expiration
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Detect 401 Unauthorized
    // The prompt says "Server responds with 401 Unauthorized (Token Stale)" mechanism
    if (error.response && error.response.status === 401) {
      // We can check for specific message if needed, e.g. error.response.data.message === "Token Stale"
      // For now, we treat 401 as revocation as requested for the global flow

      // Prevent infinite loop if the retry was attempted (though we are NOT retrying here)
      // The prompt says: "Does not try to auto-refresh the token (break the loop)."
      // So we strictly DO NOT try to refresh.

      if (!originalRequest._retry) {
        originalRequest._retry = true; // Mark as handled to avoid loops if other mechanisms exist

        // 1. Wipe sensitive keys from RAM
        await wipe_sensitive_data();

        // 2. Redirect to Login Screen with message
        // Since we are outside React components, we dispatch an event
        const event = new CustomEvent(SESSION_REVOKED_EVENT, {
          detail: {
            message:
              "Your password was changed on another device. Please log in again.",
          },
        });
        window.dispatchEvent(event);

        // Rejection is handled by the component consuming this promise (likely showing an error or just being unmounted)
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
