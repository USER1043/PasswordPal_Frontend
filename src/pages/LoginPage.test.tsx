import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import LoginPage from './LoginPage';
import { authService } from '../services/authService';
import * as totpService from '../services/totpService';
import { NotificationProvider } from '../context/NotificationContext';

// Mock authService
vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn(),
    completeMfaLogin: vi.fn(),
    cancelMfaLogin: vi.fn(),
    logout: vi.fn(),
  },
  registerSensitiveStateCallback: vi.fn(),
  unregisterSensitiveStateCallback: vi.fn(),
}));

vi.mock('../services/totpService', () => ({
  verifyLogin: vi.fn(),
  redeemBackupCode: vi.fn(),
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

  describe('two-factor step', () => {
    const goToMfaStep = async () => {
      // @ts-expect-error - Mocking login result which is partially typed here
      authService.login.mockResolvedValueOnce({ success: false, mfa_required: true });
      renderComponent();
      fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByLabelText(/Master Password/i), { target: { value: 'securepassword123' } });
      fireEvent.click(screen.getByRole('button', { name: /Unlock Vault/i }));
      await screen.findByText(/Back to login/i);
    };
    const submitCode = () => {
      fireEvent.change(screen.getByPlaceholderText(/000000|code/i), { target: { value: '123456' } });
      fireEvent.click(screen.getByRole('button', { name: /verify/i }));
    };

    it('unlocks the vault with the key the code check returns', async () => {
      // @ts-expect-error - Mocking partially typed response
      totpService.verifyLogin.mockResolvedValueOnce({ wrapped_mek: 'wm', salt: 's' });
      await goToMfaStep();
      submitCode();

      await waitFor(() => expect(authService.completeMfaLogin).toHaveBeenCalledWith({ wrapped_mek: 'wm', salt: 's' }));
      await waitFor(() => expect(mockOnNavigate).toHaveBeenCalledWith('vault'));
    });

    it('lets the user trust the device, and sends that choice with the code', async () => {
      // @ts-expect-error - Mocking partially typed response
      totpService.verifyLogin.mockResolvedValueOnce({ wrapped_mek: 'wm', salt: 's' });
      await goToMfaStep();
      const checkbox = screen.getByLabelText(/Trust this device for 30 days/i);
      expect(checkbox).not.toBeChecked();
      fireEvent.click(checkbox);
      submitCode();

      await waitFor(() => expect(totpService.verifyLogin).toHaveBeenCalledWith('123456', undefined, true));
    });

    it('does not trust the device unless the box is ticked', async () => {
      // @ts-expect-error - Mocking partially typed response
      totpService.verifyLogin.mockResolvedValueOnce({ wrapped_mek: 'wm', salt: 's' });
      await goToMfaStep();
      submitCode();

      await waitFor(() => expect(totpService.verifyLogin).toHaveBeenCalledWith('123456', undefined, false));
    });

    it('hides the option for backup codes, which the server does not remember', async () => {
      await goToMfaStep();
      expect(screen.getByLabelText(/Trust this device for 30 days/i)).toBeInTheDocument();
      fireEvent.click(screen.getByText(/Use a backup code instead/i));
      expect(screen.queryByLabelText(/Trust this device for 30 days/i)).not.toBeInTheDocument();
    });

    it('tells the user the code must be entered within 5 minutes', async () => {
      await goToMfaStep();
      expect(screen.getByText(/within 5 minutes/i)).toBeInTheDocument();
    });

    it('returns to the login form once the 5 minute step has timed out', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        await goToMfaStep();
        expect(screen.queryByText(/Welcome Back/i)).not.toBeInTheDocument();

        act(() => { vi.advanceTimersByTime(4 * 60 * 1000); });
        expect(screen.queryByText(/Welcome Back/i)).not.toBeInTheDocument();

        act(() => { vi.advanceTimersByTime(61 * 1000); });
        expect(await screen.findByText(/Welcome Back/i)).toBeInTheDocument();
        expect(authService.cancelMfaLogin).toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('returns to the login form when the server says the step expired', async () => {
      // @ts-expect-error - Mocking rejection
      totpService.verifyLogin.mockRejectedValueOnce({ response: { status: 401, data: { code: 'MFA_SESSION_EXPIRED' } } });
      await goToMfaStep();
      submitCode();

      expect(await screen.findByText(/Welcome Back/i)).toBeInTheDocument();
      expect(authService.cancelMfaLogin).toHaveBeenCalled();
      expect(authService.completeMfaLogin).not.toHaveBeenCalled();
    });

    it('stays on the code step when the server says the code was already used', async () => {
      // @ts-expect-error - Mocking rejection
      totpService.verifyLogin.mockRejectedValueOnce({ response: { status: 401, data: { code: 'TOTP_CODE_REUSED' } } });
      await goToMfaStep();
      submitCode();

      await waitFor(() => expect(totpService.verifyLogin).toHaveBeenCalled());
      expect(authService.cancelMfaLogin).not.toHaveBeenCalled();
      expect(screen.queryByText(/Welcome Back/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Back to login/i)).toBeInTheDocument();
    });

    it('stays on the code step for a plain wrong code', async () => {
      // @ts-expect-error - Mocking rejection
      totpService.verifyLogin.mockRejectedValueOnce({ response: { status: 401, data: { error: 'Invalid code. Please try again.' } } });
      await goToMfaStep();
      submitCode();

      await waitFor(() => expect(totpService.verifyLogin).toHaveBeenCalled());
      expect(screen.queryByText(/Welcome Back/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Back to login/i)).toBeInTheDocument();
    });

    it('does not navigate when the code is wrong', async () => {
      // @ts-expect-error - Mocking rejection
      totpService.verifyLogin.mockRejectedValueOnce({ response: { status: 401 } });
      await goToMfaStep();
      submitCode();

      await waitFor(() => expect(totpService.verifyLogin).toHaveBeenCalled());
      expect(authService.completeMfaLogin).not.toHaveBeenCalled();
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('signs out and stays on the login page if the vault cannot be unlocked', async () => {
      // @ts-expect-error - Mocking partially typed response
      totpService.verifyLogin.mockResolvedValueOnce({ wrapped_mek: 'wm', salt: 's' });
      // @ts-expect-error - Mocking rejection
      authService.completeMfaLogin.mockRejectedValueOnce(new Error('boom'));
      await goToMfaStep();
      submitCode();

      await waitFor(() => expect(authService.logout).toHaveBeenCalled());
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('drops the pending password when the user goes back to login', async () => {
      await goToMfaStep();
      fireEvent.click(screen.getByText(/Back to login/i));
      expect(authService.cancelMfaLogin).toHaveBeenCalled();
    });
  });
});
