import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../api/axiosClient';
import { verifyLogin } from './totpService';

vi.mock('../api/axiosClient', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

describe('totpService.verifyLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - Mocking apiClient post
    apiClient.post.mockResolvedValue({ data: { wrapped_mek: 'wm', salt: 's' } });
  });

  it('asks the server to trust this device when requested', async () => {
    await verifyLogin('123456', undefined, true);
    expect(apiClient.post).toHaveBeenCalledWith('/auth/totp/verify-login', {
      code: '123456', tempToken: undefined, trust_device: true,
    });
  });

  it('does not ask for trust by default, and returns the key for the vault unlock', async () => {
    const result = await verifyLogin('123456');
    expect(apiClient.post).toHaveBeenCalledWith('/auth/totp/verify-login', {
      code: '123456', tempToken: undefined, trust_device: false,
    });
    expect(result).toEqual({ wrapped_mek: 'wm', salt: 's' });
  });
});
