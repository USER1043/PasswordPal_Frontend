import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage';
import { authService } from '../services/authService';
import { NotificationProvider } from '../context/NotificationContext';

// Mock authService
vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn()
  },
  registerSensitiveStateCallback: vi.fn(),
  unregisterSensitiveStateCallback: vi.fn(),
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

  it('calls authService.login with credentials on submit', async () => {
    // @ts-expect-error - Mocking login result which is partially typed here
    authService.login.mockResolvedValueOnce({ success: true, mfa_required: false });

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
      // Assert authService.login was called with email and password
      expect(authService.login).toHaveBeenCalledWith(
        'test@example.com',
        'securepassword123'
      );
    });
  });
});
