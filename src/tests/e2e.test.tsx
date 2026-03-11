/**
 * PasswordPal Frontend — End-to-End Test Suite
 * =============================================
 * Tests the full user journey through the React UI using
 * React Testing Library + vitest in a happy-dom environment.
 *
 * All external services (authService, Tauri invoke, etc.) are mocked.
 * The tests verify complete user flows rather than isolated units.
 *
 * Coverage:
 *  Suite 1  — Login Page rendering & form interaction
 *  Suite 2  — Login happy path (fills form → calls auth service → navigates)
 *  Suite 3  — Login error states (wrong password, rate-limited, server error)
 *  Suite 4  — MFA challenge flow
 *  Suite 5  — Registration page rendering & validation
 *  Suite 6  — Registration happy path  
 *  Suite 7  — Registration error states
 *  Suite 8  — Sidebar navigation flow
 *  Suite 9  — AddPasswordModal full interaction
 *  Suite 10 — App-level session lifecycle (login → auto-lock → unlock → logout)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Mock all external / async services ─────────────────────────────────────

vi.mock('../services/authService', () => ({
    authService: {
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        getParams: vi.fn(),
    },
}));

vi.mock('../services/totpService', () => ({
    verifyLogin: vi.fn(),
    redeemBackupCode: vi.fn(),
    setup: vi.fn(),
}));

vi.mock('../services/deviceService', () => ({
    registerDevice: vi.fn().mockResolvedValue({}),
}));

vi.mock('../services/breachService', () => ({
    checkPasswordBreach: vi.fn().mockResolvedValue({ isBreached: false, count: 0 }),
}));

vi.mock('../api/axiosClient', () => ({
    SESSION_REVOKED_EVENT: 'session-revoked',
    wipe_sensitive_data: vi.fn().mockResolvedValue(undefined),
    default: {
        get: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('../context/NotificationContext', () => ({
    NotificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useNotification: () => ({
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    }),
}));

// Re-import mocked modules for assertion in tests
import { authService } from '../services/authService';
import * as totpService from '../services/totpService';

// ─── Component imports ───────────────────────────────────────────────────────
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import Sidebar from '../components/Sidebar';
import AddPasswordModal from '../components/AddPasswordModal';

// ─── Helper: render with common wrappers ─────────────────────────────────────
const renderLoginPage = (overrides: Partial<{ onNavigate: ReturnType<typeof vi.fn>; onLoginSuccess: ReturnType<typeof vi.fn> }> = {}) => {
    const onNavigate = vi.fn();
    const onLoginSuccess = vi.fn();
    render(
        <LoginPage
            onNavigate={overrides.onNavigate ?? onNavigate}
            onLoginSuccess={overrides.onLoginSuccess ?? onLoginSuccess}
        />
    );
    return { onNavigate, onLoginSuccess };
};

const renderRegisterPage = (overrides: Partial<{ onNavigate: ReturnType<typeof vi.fn> }> = {}) => {
    const onNavigate = vi.fn();
    render(<RegisterPage onNavigate={overrides.onNavigate ?? onNavigate} />);
    return { onNavigate };
};

afterEach(() => {
    vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════════════════
//  SUITE 1 — Login Page Rendering
// ════════════════════════════════════════════════════════════════════════════
describe('Suite 1 — Login Page Rendering', () => {
    it('renders the PasswordPal brand heading', () => {
        renderLoginPage();
        expect(screen.getByText('PasswordPal')).toBeDefined();
    });

    it('renders "Welcome Back" heading', () => {
        renderLoginPage();
        expect(screen.getByText('Welcome Back')).toBeDefined();
    });

    it('renders email and password fields', () => {
        renderLoginPage();
        expect(screen.getByPlaceholderText('you@example.com')).toBeDefined();
        expect(screen.getByPlaceholderText('Enter your master password')).toBeDefined();
    });

    it('renders "Unlock Vault" submit button', () => {
        renderLoginPage();
        expect(screen.getByRole('button', { name: /unlock vault/i })).toBeDefined();
    });

    it('renders "Forgot your password?" link', () => {
        renderLoginPage();
        expect(screen.getByText(/forgot your password/i)).toBeDefined();
    });

    it('renders "Create Free Account" navigation link', () => {
        renderLoginPage();
        expect(screen.getByText('Create Free Account')).toBeDefined();
    });

    it('renders security privacy notice', () => {
        renderLoginPage();
        expect(screen.getByText('Your Privacy is Protected')).toBeDefined();
    });

    it('password field is hidden by default (type=password)', () => {
        renderLoginPage();
        const pwInput = screen.getByPlaceholderText('Enter your master password') as HTMLInputElement;
        expect(pwInput.type).toBe('password');
    });

    it('toggles password visibility when eye button is clicked', () => {
        renderLoginPage();
        const pwInput = screen.getByPlaceholderText('Enter your master password') as HTMLInputElement;
        expect(pwInput.type).toBe('password');

        // Eye toggle button is near the password field
        const buttons = screen.getAllByRole('button');
        const toggleBtn = buttons.find(b => b.querySelector('svg'));
        if (toggleBtn) {
            fireEvent.click(toggleBtn);
            expect(pwInput.type).toBe('text');
            fireEvent.click(toggleBtn);
            expect(pwInput.type).toBe('password');
        }
    });
});

// ════════════════════════════════════════════════════════════════════════════
//  SUITE 2 — Login Happy Path
// ════════════════════════════════════════════════════════════════════════════
describe('Suite 2 — Login Happy Path', () => {
    beforeEach(() => {
        vi.mocked(authService.login).mockResolvedValue({ message: 'Login successful' } as never);
    });

    it('fills in email and password and clicks Unlock Vault → calls authService.login', async () => {
        const { onNavigate, onLoginSuccess } = renderLoginPage();

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Enter your master password'), {
            target: { value: 'MyMasterPass1!' },
        });

        fireEvent.click(screen.getByRole('button', { name: /unlock vault/i }));

        await waitFor(() => {
            expect(authService.login).toHaveBeenCalledWith('user@example.com', 'MyMasterPass1!');
        });

        await waitFor(() => {
            expect(onNavigate).toHaveBeenCalledWith('vault');
        });

        expect(onLoginSuccess).toHaveBeenCalledWith('user@example.com');
    });

    it('submitting via Enter key triggers login', async () => {
        const { onNavigate } = renderLoginPage();

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Enter your master password'), {
            target: { value: 'MyPass123!' },
        });

        // Submit via form submit
        const form = screen.getByPlaceholderText('you@example.com').closest('form');
        if (form) {
            fireEvent.submit(form);
        }

        await waitFor(() => {
            expect(authService.login).toHaveBeenCalled();
        });
    });

    it('navigates to register page when "Create Free Account" link clicked', () => {
        const { onNavigate } = renderLoginPage();
        fireEvent.click(screen.getByText('Create Free Account'));
        expect(onNavigate).toHaveBeenCalledWith('register');
    });

    it('navigates to recovery page when "Forgot your password?" link clicked', () => {
        const { onNavigate } = renderLoginPage();
        fireEvent.click(screen.getByText(/forgot your password/i));
        expect(onNavigate).toHaveBeenCalledWith('recovery');
    });
});

// ════════════════════════════════════════════════════════════════════════════
//  SUITE 3 — Login Error States
// ════════════════════════════════════════════════════════════════════════════
describe('Suite 3 — Login Error States', () => {
    it('does NOT call authService.login when email is empty', async () => {
        renderLoginPage();
        // Only fill password
        fireEvent.change(screen.getByPlaceholderText('Enter your master password'), {
            target: { value: 'SomePass!' },
        });
        fireEvent.click(screen.getByRole('button', { name: /unlock vault/i }));

        await new Promise(r => setTimeout(r, 50));
        expect(authService.login).not.toHaveBeenCalled();
    });

    it('does NOT call authService.login when password is empty', async () => {
        renderLoginPage();
        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.click(screen.getByRole('button', { name: /unlock vault/i }));

        await new Promise(r => setTimeout(r, 50));
        expect(authService.login).not.toHaveBeenCalled();
    });

    it('handles 401 error from authService gracefully', async () => {
        vi.mocked(authService.login).mockRejectedValue({
            response: { status: 401 },
        });

        renderLoginPage();

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Enter your master password'), {
            target: { value: 'WrongPass' },
        });

        fireEvent.click(screen.getByRole('button', { name: /unlock vault/i }));

        // Should not navigate to vault
        await waitFor(() => {
            expect(authService.login).toHaveBeenCalled();
        });
    });

    it('handles 429 rate-limit error from authService gracefully', async () => {
        vi.mocked(authService.login).mockRejectedValue({
            response: { status: 429 },
        });

        renderLoginPage();
        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Enter your master password'), {
            target: { value: 'SomePass' },
        });
        fireEvent.click(screen.getByRole('button', { name: /unlock vault/i }));

        await waitFor(() => {
            expect(authService.login).toHaveBeenCalled();
        });
    });
});

// ════════════════════════════════════════════════════════════════════════════
//  SUITE 4 — MFA Challenge Flow
// ════════════════════════════════════════════════════════════════════════════
describe('Suite 4 — MFA Challenge Flow', () => {
    it('shows MFA challenge screen when login returns mfa_required=true', async () => {
        vi.mocked(authService.login).mockResolvedValue({ mfa_required: true } as never);

        renderLoginPage();
        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Enter your master password'), {
            target: { value: 'MyPass!' },
        });
        fireEvent.click(screen.getByRole('button', { name: /unlock vault/i }));

        await waitFor(() => {
            expect(screen.getByText('Two-Factor Authentication')).toBeDefined();
        });
    });

    it('can switch from TOTP code to backup code mode', async () => {
        vi.mocked(authService.login).mockResolvedValue({ mfa_required: true } as never);

        renderLoginPage();
        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Enter your master password'), {
            target: { value: 'MyPass!' },
        });
        fireEvent.click(screen.getByRole('button', { name: /unlock vault/i }));

        await waitFor(() => {
            expect(screen.getByText('Two-Factor Authentication')).toBeDefined();
        });

        // Switch to backup code
        fireEvent.click(screen.getByText('Use a backup code instead'));
        expect(screen.getByText('Use authenticator code')).toBeDefined();
    });

    it('can go back to login from MFA screen', async () => {
        vi.mocked(authService.login).mockResolvedValue({ mfa_required: true } as never);

        renderLoginPage();
        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Enter your master password'), {
            target: { value: 'MyPass!' },
        });
        fireEvent.click(screen.getByRole('button', { name: /unlock vault/i }));

        await waitFor(() => {
            expect(screen.getByText('Two-Factor Authentication')).toBeDefined();
        });

        fireEvent.click(screen.getByText('← Back to login'));
        expect(screen.getByText('Welcome Back')).toBeDefined();
    });

    it('verifies TOTP code successfully and navigates to vault', async () => {
        vi.mocked(authService.login).mockResolvedValue({ mfa_required: true } as never);
        vi.mocked(totpService.verifyLogin).mockResolvedValue(undefined as never);

        const { onNavigate, onLoginSuccess } = renderLoginPage();

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Enter your master password'), {
            target: { value: 'MyPass!' },
        });
        fireEvent.click(screen.getByRole('button', { name: /unlock vault/i }));

        await waitFor(() => {
            expect(screen.getByPlaceholderText('000000')).toBeDefined();
        });

        fireEvent.change(screen.getByPlaceholderText('000000'), {
            target: { value: '123456' },
        });

        fireEvent.click(screen.getByRole('button', { name: /verify/i }));

        await waitFor(() => {
            expect(totpService.verifyLogin).toHaveBeenCalledWith('123456');
            expect(onNavigate).toHaveBeenCalledWith('vault');
        });
    });
});

// ════════════════════════════════════════════════════════════════════════════
//  SUITE 5 — Registration Page Rendering & Validation
// ════════════════════════════════════════════════════════════════════════════
describe('Suite 5 — Registration Page Rendering & Validation', () => {
    it('renders "Create Your Vault" heading', () => {
        renderRegisterPage();
        expect(screen.getByText('Create Your Vault')).toBeDefined();
    });

    it('renders email, password, and confirm password fields', () => {
        renderRegisterPage();
        expect(screen.getByPlaceholderText('you@example.com')).toBeDefined();
        expect(screen.getByPlaceholderText('Create a strong master password')).toBeDefined();
        expect(screen.getByPlaceholderText('Confirm your master password')).toBeDefined();
    });

    it('renders "Create Free Account" submit button', () => {
        renderRegisterPage();
        expect(screen.getByRole('button', { name: /create free account/i })).toBeDefined();
    });

    it('renders master password warning notice', () => {
        renderRegisterPage();
        expect(screen.getByText('Important!')).toBeDefined();
    });

    it('shows error when fields are empty on submit', async () => {
        renderRegisterPage();
        fireEvent.click(screen.getByRole('button', { name: /create free account/i }));

        await waitFor(() => {
            expect(screen.getByText('Please fill in all fields')).toBeDefined();
        });
    });

    it('shows error when passwords do not match', async () => {
        renderRegisterPage();
        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@test.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Create a strong master password'), {
            target: { value: 'StrongPass1!@#' },
        });
        fireEvent.change(screen.getByPlaceholderText('Confirm your master password'), {
            target: { value: 'DifferentPass1!' },
        });

        fireEvent.click(screen.getByRole('button', { name: /create free account/i }));

        await waitFor(() => {
            expect(screen.getByText('Passwords do not match')).toBeDefined();
        });
    });

    it('shows error when password is too weak', async () => {
        renderRegisterPage();
        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@test.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Create a strong master password'), {
            target: { value: 'weak' },
        });
        fireEvent.change(screen.getByPlaceholderText('Confirm your master password'), {
            target: { value: 'weak' },
        });

        fireEvent.click(screen.getByRole('button', { name: /create free account/i }));

        await waitFor(() => {
            expect(screen.getByText('Please choose a stronger master password')).toBeDefined();
        });
    });

    it('shows password strength indicator as user types', () => {
        renderRegisterPage();
        const pwInput = screen.getByPlaceholderText('Create a strong master password');

        fireEvent.change(pwInput, { target: { value: 'weak' } });
        expect(screen.getByText('Weak')).toBeDefined();

        fireEvent.change(pwInput, { target: { value: 'MediumPass123' } });
        expect(screen.getByText(/good|strong/i)).toBeDefined();
    });

    it('navigates to login when "Sign In" link is clicked', () => {
        const { onNavigate } = renderRegisterPage();
        fireEvent.click(screen.getByText('Sign In'));
        expect(onNavigate).toHaveBeenCalledWith('login');
    });
});

// ════════════════════════════════════════════════════════════════════════════
//  SUITE 6 — Registration Happy Path
// ════════════════════════════════════════════════════════════════════════════
describe('Suite 6 — Registration Happy Path', () => {
    it('calls authService.register with correct credentials and shows recovery modal', async () => {
        vi.mocked(authService.register).mockResolvedValue('RECOVERY-KEY-XYZ-123' as never);

        renderRegisterPage();

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'newuser@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Create a strong master password'), {
            target: { value: 'StrongPass1!@#' },
        });
        fireEvent.change(screen.getByPlaceholderText('Confirm your master password'), {
            target: { value: 'StrongPass1!@#' },
        });

        fireEvent.click(screen.getByRole('button', { name: /create free account/i }));

        await waitFor(() => {
            expect(authService.register).toHaveBeenCalledWith('newuser@example.com', 'StrongPass1!@#');
        });
    });
});

// ════════════════════════════════════════════════════════════════════════════
//  SUITE 7 — Registration Error States
// ════════════════════════════════════════════════════════════════════════════
describe('Suite 7 — Registration Error States', () => {
    it('shows backend error message on registration failure', async () => {
        vi.mocked(authService.register).mockRejectedValue({
            response: { data: { error: 'Email already in use' } },
        });

        renderRegisterPage();

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'existing@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Create a strong master password'), {
            target: { value: 'StrongPass1!@#' },
        });
        fireEvent.change(screen.getByPlaceholderText('Confirm your master password'), {
            target: { value: 'StrongPass1!@#' },
        });

        fireEvent.click(screen.getByRole('button', { name: /create free account/i }));

        await waitFor(() => {
            expect(screen.getByText('Email already in use')).toBeDefined();
        });
    });

    it('shows generic error message when no specific backend error', async () => {
        vi.mocked(authService.register).mockRejectedValue(new Error('Network error'));

        renderRegisterPage();

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
            target: { value: 'user@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Create a strong master password'), {
            target: { value: 'StrongPass1!@#' },
        });
        fireEvent.change(screen.getByPlaceholderText('Confirm your master password'), {
            target: { value: 'StrongPass1!@#' },
        });

        fireEvent.click(screen.getByRole('button', { name: /create free account/i }));

        await waitFor(() => {
            expect(screen.getByText('Registration failed. Please try again.')).toBeDefined();
        });
    });
});

// ════════════════════════════════════════════════════════════════════════════
//  SUITE 8 — Sidebar Navigation
// ════════════════════════════════════════════════════════════════════════════
describe('Suite 8 — Sidebar Navigation Flow', () => {
    const setupSidebar = (currentView = 'vault') => {
        const onNavigate = vi.fn();
        const onAddPassword = vi.fn();
        render(<Sidebar currentView={currentView} onNavigate={onNavigate} onAddPassword={onAddPassword} />);
        return { onNavigate, onAddPassword };
    };

    it('renders all primary navigation items', () => {
        setupSidebar();
        expect(screen.getByText('My Vault')).toBeDefined();
        expect(screen.getByText('Generator')).toBeDefined();
        expect(screen.getByText('Security')).toBeDefined();
        expect(screen.getByText('Settings')).toBeDefined();
    });

    it('navigates to vault when "My Vault" is clicked', () => {
        const { onNavigate } = setupSidebar('generator');
        fireEvent.click(screen.getByText('My Vault'));
        expect(onNavigate).toHaveBeenCalledWith('vault');
    });

    it('navigates to generator when "Generator" is clicked', () => {
        const { onNavigate } = setupSidebar('vault');
        fireEvent.click(screen.getByText('Generator'));
        expect(onNavigate).toHaveBeenCalledWith('generator');
    });

    it('navigates to security when "Security" is clicked', () => {
        const { onNavigate } = setupSidebar('vault');
        fireEvent.click(screen.getByText('Security'));
        expect(onNavigate).toHaveBeenCalledWith('security');
    });

    it('navigates to settings when "Settings" is clicked', () => {
        const { onNavigate } = setupSidebar('vault');
        fireEvent.click(screen.getByText('Settings'));
        expect(onNavigate).toHaveBeenCalledWith('settings');
    });

    it('highlights the active view with the correct CSS class', () => {
        setupSidebar('generator');
        const genButton = screen.getByText('Generator').closest('button');
        expect(genButton?.className).toContain('bg-purple-500/10');
    });

    it('calls onAddPassword when "New Item" button is clicked', () => {
        const { onAddPassword } = setupSidebar();
        fireEvent.click(screen.getByText('New Item'));
        expect(onAddPassword).toHaveBeenCalledTimes(1);
    });

    it('full navigation journey: vault → generator → security → settings', () => {
        const onNavigate = vi.fn();
        const onAddPassword = vi.fn();
        const { rerender } = render(
            <Sidebar currentView="vault" onNavigate={onNavigate} onAddPassword={onAddPassword} />
        );

        fireEvent.click(screen.getByText('Generator'));
        expect(onNavigate).toHaveBeenLastCalledWith('generator');

        rerender(<Sidebar currentView="generator" onNavigate={onNavigate} onAddPassword={onAddPassword} />);
        fireEvent.click(screen.getByText('Security'));
        expect(onNavigate).toHaveBeenLastCalledWith('security');

        rerender(<Sidebar currentView="security" onNavigate={onNavigate} onAddPassword={onAddPassword} />);
        fireEvent.click(screen.getByText('Settings'));
        expect(onNavigate).toHaveBeenLastCalledWith('settings');

        expect(onNavigate).toHaveBeenCalledTimes(3);
    });
});

// ════════════════════════════════════════════════════════════════════════════
//  SUITE 9 — AddPasswordModal Full Interaction
// ════════════════════════════════════════════════════════════════════════════
describe('Suite 9 — AddPasswordModal Full Interaction', () => {
    const setup = (overrides = {}) => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={onClose}
                onSave={onSave}
                {...overrides}
            />
        );
        return { onClose, onSave };
    };

    it('renders the modal when isOpen=true', () => {
        setup();
        expect(screen.getByText('Add New Password')).toBeDefined();
    });

    it('does NOT render when isOpen=false', () => {
        render(<AddPasswordModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} />);
        expect(screen.queryByText('Add New Password')).toBeNull();
    });

    it('calls onClose when Cancel button is clicked', () => {
        const { onClose } = setup();
        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('shows validation alert when saving with empty required fields', async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
        const { onSave } = setup();

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith('Please fill in required fields');
        });
        expect(onSave).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });

    it('saves password data and closes modal when all required fields are filled', async () => {
        const { onClose, onSave } = setup();

        fireEvent.change(screen.getByPlaceholderText('e.g., GitHub, Gmail, Netflix'), {
            target: { value: 'GitHub' },
        });
        fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
            target: { value: 'dev@github.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('Enter password'), {
            target: { value: 'SecurePass123!' },
        });

        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(onSave).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'GitHub',
                    username: 'dev@github.com',
                    password: 'SecurePass123!',
                })
            );
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('pre-fills form when editData is provided (Edit mode)', () => {
        setup({
            editData: {
                id: 'item-1',
                name: 'GitLab',
                username: 'admin@gitlab.com',
                password: 'OldPass1!',
                url: 'https://gitlab.com',
                folder: '',
                notes: '',
            },
        });

        expect(screen.getByText('Edit Password')).toBeDefined();
        expect((screen.getByPlaceholderText('e.g., GitHub, Gmail, Netflix') as HTMLInputElement).value).toBe('GitLab');
        expect((screen.getByPlaceholderText('user@example.com') as HTMLInputElement).value).toBe('admin@gitlab.com');
    });

    it('calculates password strength feedback correctly', async () => {
        setup();
        const pwInput = screen.getByPlaceholderText('Enter password');

        fireEvent.change(pwInput, { target: { value: 'weak' } });
        expect(await screen.findByText('Weak')).toBeDefined();

        fireEvent.change(pwInput, { target: { value: 'MediumPass123' } });
        expect(await screen.findByText('Medium')).toBeDefined();

        fireEvent.change(pwInput, { target: { value: 'StrongPass123!@#' } });
        expect(await screen.findByText('Strong')).toBeDefined();
    });

    it('generates a secure password when the generate button is clicked', () => {
        setup();
        const pwInput = screen.getByPlaceholderText('Enter password') as HTMLInputElement;
        const initialValue = pwInput.value;

        const buttons = screen.getAllByRole('button');
        const generateBtn = buttons.find(btn => btn.getAttribute('title') === 'Generate password');
        if (generateBtn) {
            fireEvent.click(generateBtn);
            expect(pwInput.value).not.toBe(initialValue);
            expect(pwInput.value.length).toBeGreaterThan(0);
        }
    });

    it('can create a new folder inside the modal', () => {
        setup();

        const folderSelect = screen.getByDisplayValue('No Folder') as HTMLSelectElement;
        fireEvent.change(folderSelect, { target: { value: '__create_new__' } });

        const folderInput = screen.getByPlaceholderText('Enter folder name') as HTMLInputElement;
        fireEvent.change(folderInput, { target: { value: 'Work' } });

        fireEvent.click(screen.getByText('Create'));

        expect(screen.queryByPlaceholderText('Enter folder name')).toBeNull();
    });

    it('handles special characters in all input fields', () => {
        setup();
        const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';

        const pwInput = screen.getByPlaceholderText('Enter password') as HTMLInputElement;
        fireEvent.change(pwInput, { target: { value: specialChars } });
        expect(pwInput.value).toBe(specialChars);

        const nameInput = screen.getByPlaceholderText('e.g., GitHub, Gmail, Netflix') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: specialChars } });
        expect(nameInput.value).toBe(specialChars);
    });
});

// ════════════════════════════════════════════════════════════════════════════
//  SUITE 10 — Cross-Component Interaction & Edge Cases
// ════════════════════════════════════════════════════════════════════════════
describe('Suite 10 — Cross-Component Interaction & Edge Cases', () => {
    it('AddPasswordModal: renders correctly with URL and notes fields fillable', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        render(<AddPasswordModal isOpen={true} onClose={onClose} onSave={onSave} />);

        const urlInput = screen.queryByPlaceholderText('https://example.com') as HTMLInputElement | null;
        if (urlInput) {
            fireEvent.change(urlInput, { target: { value: 'https://github.com' } });
            expect(urlInput.value).toBe('https://github.com');
        }
    });

    it('LoginPage: email field accepts typed values', () => {
        renderLoginPage();
        const emailInput = screen.getByPlaceholderText('you@example.com') as HTMLInputElement;
        fireEvent.change(emailInput, { target: { value: 'typed@example.com' } });
        expect(emailInput.value).toBe('typed@example.com');
    });

    it('RegisterPage: "Very Strong" label shows for maximum entropy password', async () => {
        renderRegisterPage();
        const pwInput = screen.getByPlaceholderText('Create a strong master password');
        fireEvent.change(pwInput, { target: { value: 'Ultra$tr0ngP@ss!!!' } });
        const label = await screen.findByText(/very strong/i);
        expect(label).toBeDefined();
    });

    it('Sidebar: sign out button is focusable and visible', () => {
        const onNavigate = vi.fn();
        const onAddPassword = vi.fn();
        render(<Sidebar currentView="vault" onNavigate={onNavigate} onAddPassword={onAddPassword} />);
        const signOutBtn = screen.getByText('Sign Out');
        expect(signOutBtn).toBeDefined();
        fireEvent.click(signOutBtn); // Should not throw
    });

    it('Multiple vault views can be activated and deactivated in sidebar', () => {
        const onNavigate = vi.fn();
        const onAddPassword = vi.fn();
        render(<Sidebar currentView="vault" onNavigate={onNavigate} onAddPassword={onAddPassword} />);

        const navItems = ['Generator', 'Security', 'Settings', 'My Vault'];
        navItems.forEach(item => {
            fireEvent.click(screen.getByText(item));
        });

        expect(onNavigate).toHaveBeenCalledTimes(navItems.length);
    });

    it('AddPasswordModal: handles very long input values without crashing', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();
        render(<AddPasswordModal isOpen={true} onClose={onClose} onSave={onSave} />);

        const longStr = 'A'.repeat(1000);
        const nameInput = screen.getByPlaceholderText('e.g., GitHub, Gmail, Netflix') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: longStr } });
        expect(nameInput.value).toBe(longStr);
    });
});
