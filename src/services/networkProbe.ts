// ============================================================================
// Network Probe Utility
// ============================================================================
// A highly reliable, cache-busting HTTP GET request to determine if the 
// specific Supabase/Node backend API is alive on the network without falling
// into the Tauri navigator.onLine WebView trap.
// ============================================================================
import { fetch } from "@tauri-apps/plugin-http";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export async function isServerReachable(): Promise<boolean> {
  try {
    const fetchPromise = fetch(
      `${API_BASE_URL}/health?t=${Date.now()}`,
      {
        method: "GET",
        headers: { "Cache-Control": "no-store", "Pragma": "no-cache" },
        connectTimeout: 3000, // Tauri native timeout
      }
    );

    // Hard JS fallback timeout to prevent UI hangs if Rust layer stalls
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout")), 3000);
    });

    const res = await Promise.race([fetchPromise, timeoutPromise]);
    return res.status === 204;
  } catch {
    return false; // timeout, DNS failure, refused connection = unreachable
  }
}
