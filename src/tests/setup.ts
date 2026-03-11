import '@testing-library/jest-dom';
import { vi } from 'vitest';

/**
 * Global Test Setup
 * Mocking Tauri APIs natively absent in jsdom
 */

// Mock window.crypto.randomUUID and getRandomValues
Object.defineProperty(window, 'crypto', {
    value: {
        randomUUID: () => '12345678-1234-1234-1234-123456789012',
        getRandomValues: (buffer: Uint8Array) => {
            for (let i = 0; i < buffer.length; i++) {
                buffer[i] = Math.floor(Math.random() * 256);
            }
            return buffer;
        },
    },
});

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

// Mock native fetch
vi.mock('@tauri-apps/plugin-http', () => ({
    fetch: vi.fn(),
}));
