// ============================================================================
// HTTP client for communicating with the backend API
// Handles token refresh, session revocation, and sensitive data wiping via Tauri Native Fetch
// ============================================================================
import { fetch } from "@tauri-apps/plugin-http";
import { invoke } from "@tauri-apps/api/core";

export const SESSION_REVOKED_EVENT = "session-revoked";

// We point to Vite's environment variable which we set to the Render backend url in production
const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

let cachedUserAgent: string | null = null;

async function getUserAgent(): Promise<string> {
  if (cachedUserAgent) return cachedUserAgent;
  try {
    cachedUserAgent = await invoke<string>("get_os_info");
  } catch {
    cachedUserAgent = navigator.userAgent;
  }
  return cachedUserAgent;
}

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

interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
  _retry?: boolean;
}

// Custom adapter to replace axios and use Tauri's native Rust HTTP client
// By using Tauri's fetch we bypass the browser's CORS restrictions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tauriFetchAdapter(url: string, options: FetchOptions = {}): Promise<any> {
  let fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;

  if (options.params) {
    const searchParams = new URLSearchParams(options.params);
    fullUrl += `?${searchParams.toString()}`;
  }

  const headers: Record<string, string> = { ...options.headers };
  // Case-insensitive check for content-type
  const hasContentType = Object.keys(headers).some(k => k.toLowerCase() === "content-type");

  if (!hasContentType && options.body !== undefined && options.body !== null) {
    headers["Content-Type"] = "application/json";
  }

  // Tauri's native HTTP client does not automatically attach a User-Agent.
  // We fetch the OS username natively via Rust to display cleaner User-Agents in Audit Logs.
  if (!Object.keys(headers).some(k => k.toLowerCase() === "user-agent")) {
    headers["User-Agent"] = await getUserAgent();
  }

  const fetchOptions: Record<string, unknown> = {
    method: options.method || "GET",
    headers,
    credentials: "include", // Required for cross-origin cookies in Tauri WebView 
  };

  if (options.body) {
    if (typeof options.body === "object") {
      fetchOptions.body = JSON.stringify(options.body);
    } else {
      fetchOptions.body = options.body;
    }
  }

  try {
    const response = await fetch(fullUrl, fetchOptions);
    const contentType = response.headers.get("content-type") ?? "";
    let data: unknown;
    if (contentType.includes("application/json")) {
      data = await response.json().catch(() => ({}));
    } else {
      data = await response.text().catch(() => "");
    }

    if (!response.ok) {
      if (response.status === 401 && !options._retry) {
        if (
          url.includes("/auth/refresh") ||
          url.includes("/auth/login") ||
          url.includes("/auth/register")
        ) {
          return Promise.reject({
            response: { status: response.status, data },
            config: options,
          });
        }

        options._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;
          try {
            await fetch(`${BASE_URL}/auth/refresh`, { method: "POST" });
            isRefreshing = false;
            onRefreshed(true);
            return tauriFetchAdapter(url, options); // Retry original request
          } catch {
            isRefreshing = false;
            onRefreshed(false);

            await wipe_sensitive_data();
            const event = new CustomEvent(SESSION_REVOKED_EVENT, {
              detail: {
                message: "Your session has expired. Please log in again.",
              },
            });
            window.dispatchEvent(event);
            return Promise.reject({
              response: { status: response.status, data },
              config: options,
            });
          }
        } else {
          return new Promise((resolve, reject) => {
            refreshSubscribers.push((success: boolean) => {
              if (success) {
                resolve(tauriFetchAdapter(url, options));
              } else {
                reject({
                  response: { status: response.status, data },
                  config: options,
                });
              }
            });
          });
        }
      }

      return Promise.reject({
        response: {
          status: response.status,
          data: data,
        },
        config: options,
      });
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    };
  } catch (err: unknown) {
    console.error("Tauri Fetch Error:", err);
    return Promise.reject(err);
  }
}

// Create a mock apiClient object that provides .get, .post, .put, .delete like Axios
const apiClient = {
  get: (url: string, config?: FetchOptions) => tauriFetchAdapter(url, { ...config, method: "GET" }),
  post: (url: string, data?: unknown, config?: FetchOptions) => tauriFetchAdapter(url, { ...config, method: "POST", body: data }),
  put: (url: string, data?: unknown, config?: FetchOptions) => tauriFetchAdapter(url, { ...config, method: "PUT", body: data }),
  delete: (url: string, config?: FetchOptions) => tauriFetchAdapter(url, { ...config, method: "DELETE" }),
  interceptors: {
    request: { use: () => { } },
    response: { use: () => { } },
  }
};

export default apiClient;
