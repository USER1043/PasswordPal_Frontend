import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Fix for window.alert
if (typeof window !== 'undefined') {
    window.alert = vi.fn();
}

// Mock Tauri APIs to prevent stderr clutter
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-http', () => ({
    fetch: vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
    }),
}));

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(),
    emit: vi.fn(),
}));

