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
});
