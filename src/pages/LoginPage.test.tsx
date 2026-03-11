import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage';
import { authService } from '../services/authService';
import { NotificationProvider } from '../context/NotificationContext';

// Mock authService
vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn()
  }
}));

// Mock useNotification to prevent it trying to render actual toasts if we accidentally trigger one
vi.mock('../context/NotificationContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../context/NotificationContext')>();
  return {
    ...actual,
    useNotification: () => ({
      success: vi.fn(),
      error: vi.fn()
    })
  };
});

describe('LoginPage - Session Isolation & Fingerprinting', () => {
  const mockOnNavigate = vi.fn();
  const mockOnLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <NotificationProvider>
        <LoginPage onNavigate={mockOnNavigate} onLoginSuccess={mockOnLoginSuccess} />
      </NotificationProvider>
    );
  };

  it('generates a fresh device UUID on login and passes it to authService.login', async () => {
    // @ts-ignore
    authService.login.mockResolvedValueOnce({ success: true, mfa_required: false });

    // Mock randomUUID to ensure we can assert against a predictable value
    const expectedUuid = '12345678-1234-1234-1234-123456789012';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(expectedUuid);

    renderComponent();

    // Fill in credentials
    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Master Password/i);
    const submitButton = screen.getByRole('button', { name: /Unlock Vault/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'securepassword123' } });

    // Submit form
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Assert authService.login was called with email, password, AND the fresh deviceFingerprint
      expect(authService.login).toHaveBeenCalledWith(
        'test@example.com',
        'securepassword123',
        expectedUuid
      );
    });
  });
});
