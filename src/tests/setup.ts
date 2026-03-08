import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Mock @tauri-apps/api/core
//
// WHY: Tauri's `invoke()` function relies on the native Tauri IPC bridge which
// only exists inside a real Tauri window. In the jsdom test environment it is
// undefined, causing any component that imports it (e.g. Sidebar) to throw:
//   TypeError: __TAURI_INTERNALS__ is not defined
//
// The mock below replaces the entire module with a vi.fn() that resolves to
// null by default. Individual tests can override it with:
//   vi.mocked(invoke).mockResolvedValueOnce({ ... })
// ─────────────────────────────────────────────────────────────────────────────
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(null),
}));
