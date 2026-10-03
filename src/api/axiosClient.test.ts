import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetch } from '@tauri-apps/plugin-http';
import { invoke } from '@tauri-apps/api/core';
import apiClient, { SESSION_REVOKED_EVENT } from './axiosClient';

vi.mock('@tauri-apps/plugin-http', () => ({
  fetch: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockResponse = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: '',
  headers: { get: () => 'application/json' },
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
const invokeMock = invoke as unknown as ReturnType<typeof vi.fn>;

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invokeMock.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_local_identity') {
        return { device_id: 'a1b2c3d4-0000-4000-8000-123456789abc', device_name: 'linux/tester' };
      }
      return null;
    });
  });

  describe('device identity headers', () => {
    it('sends the same persistent X-Device-Id and User-Agent on every request', async () => {
      fetchMock.mockResolvedValue(mockResponse(200));

      await apiClient.post('/auth/login', { email: 'a@b.c', auth_hash: 'h' });
      await apiClient.get('/api/vault');

      const headersOf = (call: number) => fetchMock.mock.calls[call][1].headers as Record<string, string>;
      expect(headersOf(0)['X-Device-Id']).toBe('a1b2c3d4-0000-4000-8000-123456789abc');
      expect(headersOf(0)['User-Agent']).toBe('linux/tester');
      expect(headersOf(1)['X-Device-Id']).toBe(headersOf(0)['X-Device-Id']);
    });
  });

  describe('session revocation', () => {
    it('dispatches SESSION_REVOKED_EVENT when the refresh is rejected (device revoked/blocked)', async () => {
      const onRevoked = vi.fn();
      window.addEventListener(SESSION_REVOKED_EVENT, onRevoked);

      fetchMock
        .mockResolvedValueOnce(mockResponse(401, { code: 'SESSION_REVOKED' })) // original request
        .mockResolvedValueOnce(mockResponse(401, { code: 'SESSION_REVOKED' })); // /auth/refresh

      await expect(apiClient.get('/api/vault')).rejects.toMatchObject({ response: { status: 401 } });

      expect(onRevoked).toHaveBeenCalledTimes(1);
      expect(invokeMock).toHaveBeenCalledWith('lock_vault');
      window.removeEventListener(SESSION_REVOKED_EVENT, onRevoked);
    });

    it('does not log out when the refresh fails for a non-auth reason (offline)', async () => {
      const onRevoked = vi.fn();
      window.addEventListener(SESSION_REVOKED_EVENT, onRevoked);

      fetchMock
        .mockResolvedValueOnce(mockResponse(401)) // original request
        .mockResolvedValueOnce(mockResponse(503)) // /auth/refresh - DB unreachable
        .mockResolvedValueOnce(mockResponse(503)); // retried request

      await expect(apiClient.get('/api/vault')).rejects.toMatchObject({ response: { status: 503 } });

      expect(onRevoked).not.toHaveBeenCalled();
      window.removeEventListener(SESSION_REVOKED_EVENT, onRevoked);
    });
  });
});
