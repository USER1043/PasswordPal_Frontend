import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState, useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterPage from './RegisterPage';
import { authService } from '../services/authService';
import { registerDevice } from '../services/deviceService';
import { SESSION_REVOKED_EVENT } from '../api/axiosClient';

vi.mock('../services/authService', () => ({
  authService: { register: vi.fn() },
}));

vi.mock('../services/deviceService', () => ({
  registerDevice: vi.fn(),
}));

vi.mock('../context/NotificationContext', () => ({
  useNotification: () => ({ success: vi.fn(), error: vi.fn() }),
}));

// Behaves like App.tsx: a session-revoked event sends the user back to the login view,
// which unmounts the register page (and with it the recovery key modal).
function Harness() {
  const [view, setView] = useState<'register' | 'login'>('register');
  useEffect(() => {
    const handler = () => setView('login');
    window.addEventListener(SESSION_REVOKED_EVENT, handler);
    return () => window.removeEventListener(SESSION_REVOKED_EVENT, handler);
  }, []);
  return view === 'register' ? <RegisterPage onNavigate={vi.fn()} /> : <div>login view</div>;
}

describe('RegisterPage - recovery key', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-expect-error - Mocking register result
    authService.register.mockResolvedValue('THE-RECOVERY-KEY');
    // The real call hits an authenticated endpoint with no session yet, gets a 401, and
    // the API client answers a failed refresh with a session-revoked event.
    // @ts-expect-error - Mocking registerDevice
    registerDevice.mockImplementation(async () => {
      window.dispatchEvent(new CustomEvent(SESSION_REVOKED_EVENT));
    });
  });

  it('shows the recovery key to download after a successful registration', async () => {
    render(<Harness />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.c' } });
    fireEvent.change(screen.getByPlaceholderText('Create a strong master password'), { target: { value: 'Str0ng!Passw0rd#2026' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm your master password'), { target: { value: 'Str0ng!Passw0rd#2026' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Free Account/i }));

    await waitFor(() => expect(authService.register).toHaveBeenCalledWith('a@b.c', 'Str0ng!Passw0rd#2026'));
    expect(await screen.findByText(/Download Recovery Key/i)).toBeInTheDocument();
    expect(screen.queryByText('login view')).not.toBeInTheDocument();
  });
});
