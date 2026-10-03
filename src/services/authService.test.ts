import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';
import apiClient from '../api/axiosClient';
import { invoke } from '@tauri-apps/api/core';

// Mock dependencies
vi.mock('../api/axiosClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  }
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

vi.mock('./networkProbe', () => ({
  isServerReachable: vi.fn().mockResolvedValue(true)
}));

describe('authService - Session Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('logout: Scorched Earth implementation', () => {
    it('should explicitly call backend /auth/logout to clear HttpOnly tokens', async () => {
      await authService.logout();
      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('should clear all sensitive local storage variables', async () => {
      localStorage.setItem('offline_token', 'test-token');
      localStorage.setItem('active_user', 'user@example.com');
      sessionStorage.setItem('temp_data', 'secret');

      await authService.logout();

      expect(localStorage.getItem('offline_token')).toBeNull();
      expect(localStorage.getItem('active_user')).toBeNull();
      expect(sessionStorage.getItem('temp_data')).toBeNull();
    });

    it('should invoke lock_vault in Rust to drop encryption keys from memory', async () => {
      await authService.logout();
      expect(invoke).toHaveBeenCalledWith('lock_vault');
    });

    it('should NOT invoke clear_local_auth_cache in rust to preserve offline SQLite caching', async () => {
      await authService.logout();
      expect(invoke).not.toHaveBeenCalledWith('clear_local_auth_cache');
    });

    it('should handle backend logout failure gracefully and continue wiping local data', async () => {
      // @ts-expect-error - Mocking rejected value on vi.fn()
      apiClient.post.mockRejectedValueOnce(new Error('Network error'));
      
      localStorage.setItem('active_user', 'user@example.com');
      
      await authService.logout();
      
      // Despite backend failing, it should still clear local storage and Rust caches
      expect(localStorage.getItem('active_user')).toBeNull();
      expect(invoke).toHaveBeenCalledWith('lock_vault');
      expect(invoke).not.toHaveBeenCalledWith('clear_local_auth_cache');
    });
  });

  describe('changePassword', () => {
    const mockRust = (cached: { salt: string; wrapped_mek: string } | null) => {
      // @ts-expect-error - Mocking invoke
      invoke.mockImplementation(async (cmd: string, args: { password?: string }) => {
        if (cmd === 'get_cached_auth_params') return cached;
        if (cmd === 'derive_auth_hash') return `hash-of-${args.password}`;
        if (cmd === 'change_password_optimization') return 'new-wrapped-mek';
        if (cmd === 'login_vault') return { auth_hash: `hash-of-${args.password}` };
        return null;
      });
    };

    it('proves the current password and sends the re-wrapped key', async () => {
      mockRust({ salt: 'salt', wrapped_mek: 'old-wrapped-mek' });
      // @ts-expect-error - Mocking apiClient post
      apiClient.post.mockResolvedValue({ data: { other_devices_signed_out: true } });

      const result = await authService.changePassword('a@b.c', 'old-pass', 'new-pass');

      expect(invoke).toHaveBeenCalledWith('change_password_optimization', {
        encryptedMekBlob: 'old-wrapped-mek', oldPassword: 'old-pass', newPassword: 'new-pass', salt: 'salt',
      });
      expect(apiClient.post).toHaveBeenCalledWith('/auth/change-password', {
        salt: 'salt',
        wrapped_mek: 'new-wrapped-mek',
        auth_hash: 'hash-of-new-pass',
        current_auth_hash: 'hash-of-old-pass',
      });
      expect(result.otherDevicesSignedOut).toBe(true);
    });

    it('updates the local auth cache after the server accepts the change', async () => {
      mockRust({ salt: 'salt', wrapped_mek: 'old-wrapped-mek' });
      // @ts-expect-error - Mocking apiClient post
      apiClient.post.mockResolvedValue({ data: { other_devices_signed_out: true } });

      await authService.changePassword('a@b.c', 'old-pass', 'new-pass');

      expect(invoke).toHaveBeenCalledWith('cache_auth_params', {
        email: 'a@b.c', salt: 'salt', wrappedMek: 'new-wrapped-mek', localPasswordHash: 'hash-of-new-pass',
      });
    });

    it('leaves the local cache alone if the server rejects the change', async () => {
      mockRust({ salt: 'salt', wrapped_mek: 'old-wrapped-mek' });
      // @ts-expect-error - Mocking apiClient post
      apiClient.post.mockRejectedValue({ response: { status: 401 } });

      await expect(authService.changePassword('a@b.c', 'wrong', 'new-pass')).rejects.toMatchObject({ response: { status: 401 } });

      expect(invoke).not.toHaveBeenCalledWith('cache_auth_params', expect.anything());
    });

    it('fails clearly when no wrapped key is cached locally', async () => {
      mockRust(null);

      await expect(authService.changePassword('a@b.c', 'old-pass', 'new-pass')).rejects.toThrow('No local vault key found');

      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('reports when other devices could not be signed out', async () => {
      mockRust({ salt: 'salt', wrapped_mek: 'old-wrapped-mek' });
      // @ts-expect-error - Mocking apiClient post
      apiClient.post.mockResolvedValue({ data: { other_devices_signed_out: false } });

      const result = await authService.changePassword('a@b.c', 'old-pass', 'new-pass');

      expect(result.otherDevicesSignedOut).toBe(false);
    });
  });

  describe('unlockVault (after auto-lock)', () => {
    it('unlocks with the locally cached key and never asks the server for it', async () => {
      // @ts-expect-error - Mocking invoke
      invoke.mockImplementation(async (cmd: string) =>
        cmd === 'get_cached_auth_params' ? { salt: 'salt', wrapped_mek: 'cached-wrapped-mek' } : { auth_hash: 'h' });

      await authService.unlockVault('a@b.c', 'my-password');

      expect(invoke).toHaveBeenCalledWith('login_vault', {
        password: 'my-password', salt: 'salt', wrappedMek: 'cached-wrapped-mek',
      });
      // /auth/params only returns the salt, so it must not be the source of the key
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('rejects when the password is wrong', async () => {
      // @ts-expect-error - Mocking invoke
      invoke.mockImplementation(async (cmd: string) => {
        if (cmd === 'get_cached_auth_params') return { salt: 'salt', wrapped_mek: 'cached-wrapped-mek' };
        throw 'Invalid password'; // Rust errors arrive as strings
      });

      await expect(authService.unlockVault('a@b.c', 'wrong')).rejects.toBe('Invalid password');
    });

    it('fails clearly when no key is cached on this device', async () => {
      // @ts-expect-error - Mocking invoke
      invoke.mockImplementation(async () => null);

      await expect(authService.unlockVault('a@b.c', 'my-password')).rejects.toThrow('No local vault key found');
      expect(invoke).not.toHaveBeenCalledWith('login_vault', expect.anything());
    });
  });

  describe('verifyPasswordLocally', () => {
    const mockRust = (cached: { salt: string; local_password_hash: string } | null) => {
      // @ts-expect-error - Mocking invoke
      invoke.mockImplementation(async (cmd: string, args: { password?: string }) => {
        if (cmd === 'get_cached_auth_params') return cached;
        if (cmd === 'derive_auth_hash') return `hash-of-${args.password}`;
        return null;
      });
    };

    it('accepts the correct password without contacting the server', async () => {
      mockRust({ salt: 'salt', local_password_hash: 'hash-of-correct' });

      expect(await authService.verifyPasswordLocally('a@b.c', 'correct')).toBe(true);
      expect(apiClient.post).not.toHaveBeenCalled();
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('rejects a wrong password', async () => {
      mockRust({ salt: 'salt', local_password_hash: 'hash-of-correct' });

      expect(await authService.verifyPasswordLocally('a@b.c', 'wrong')).toBe(false);
    });

    it('fails when there is no cached login data to check against', async () => {
      mockRust(null);

      await expect(authService.verifyPasswordLocally('a@b.c', 'anything')).rejects.toThrow('No local login data found');
    });
  });

  describe('verifyPassword', () => {
    it('sends only the derived hash, never the password', async () => {
      // @ts-expect-error - Mocking apiClient get
      apiClient.get.mockResolvedValue({ data: { salt: 'salt' } });
      // @ts-expect-error - Mocking apiClient post
      apiClient.post.mockResolvedValue({ data: { fresh: true } });
      // @ts-expect-error - Mocking invoke
      invoke.mockImplementation(async (cmd: string) => (cmd === 'derive_auth_hash' ? 'derived-hash' : null));

      await authService.verifyPassword('a@b.c', 'my-master-password');

      expect(apiClient.post).toHaveBeenCalledWith('/auth/verify-password', { email: 'a@b.c', auth_hash: 'derived-hash' });
      expect(JSON.stringify((apiClient.post as unknown as { mock: { calls: unknown[] } }).mock.calls)).not.toContain('my-master-password');
    });
  });

});
