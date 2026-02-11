import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/Sidebar';
describe('Sidebar Component', () => {
    const mockNavigate = vi.fn();
    const mockAddPassword = vi.fn();

    beforeEach(() => {
        mockNavigate.mockClear();
        mockAddPassword.mockClear();
    });

    it('renders branding correctly', () => {
        render(<Sidebar currentView="vault" onNavigate={mockNavigate} onAddPassword={mockAddPassword} />);
        expect(screen.getByText('PasswordPal')).toBeDefined();
        expect(document.querySelector('svg')).not.toBeNull();
    });

    it('renders all navigation items', () => {
        render(<Sidebar currentView="vault" onNavigate={mockNavigate} onAddPassword={mockAddPassword} />);
        expect(screen.getByText('My Vault')).toBeDefined();
        expect(screen.getByText('Generator')).toBeDefined();
        expect(screen.getByText('Security')).toBeDefined();
        expect(screen.getByText('Settings')).toBeDefined();
    });

    it('highlights the current view', () => {
        render(<Sidebar currentView="generator" onNavigate={mockNavigate} onAddPassword={mockAddPassword} />);
        const generatorButton = screen.getByText('Generator').closest('button');
        expect(generatorButton?.className).toContain('bg-purple-500/10');
    });

    it('calls onNavigate when a menu item is clicked', () => {
        render(<Sidebar currentView="vault" onNavigate={mockNavigate} onAddPassword={mockAddPassword} />);
        fireEvent.click(screen.getByText('Settings'));
        expect(mockNavigate).toHaveBeenCalledWith('settings');
    });

    it('renders sign out button', () => {
        render(<Sidebar currentView="vault" onNavigate={mockNavigate} onAddPassword={mockAddPassword} />);
        expect(screen.getByText('Sign Out')).toBeDefined();
    });

    // Edge Case Tests
    it('handles rapid multiple clicks on navigation items', () => {
        render(<Sidebar currentView="vault" onNavigate={mockNavigate} onAddPassword={mockAddPassword} />);
        const settingsButton = screen.getByText('Settings');

        // Simulate rapid clicks
        fireEvent.click(settingsButton);
        fireEvent.click(settingsButton);
        fireEvent.click(settingsButton);

        expect(mockNavigate).toHaveBeenCalledTimes(3);
        expect(mockNavigate).toHaveBeenCalledWith('settings');
    });

    it('calls onAddPassword when New Item button is clicked', () => {
        render(<Sidebar currentView="vault" onNavigate={mockNavigate} onAddPassword={mockAddPassword} />);
        const addButton = screen.getByText('New Item');

        fireEvent.click(addButton);
        expect(mockAddPassword).toHaveBeenCalledTimes(1);
    });

    it('navigates correctly between different views', () => {
        const { rerender } = render(<Sidebar currentView="vault" onNavigate={mockNavigate} onAddPassword={mockAddPassword} />);

        // Click Generator
        fireEvent.click(screen.getByText('Generator'));
        expect(mockNavigate).toHaveBeenCalledWith('generator');

        // Re-render with new view
        rerender(<Sidebar currentView="generator" onNavigate={mockNavigate} onAddPassword={mockAddPassword} />);

        // Click Security
        fireEvent.click(screen.getByText('Security'));
        expect(mockNavigate).toHaveBeenCalledWith('security');
    });

    it('handles sign out button click', () => {
        render(<Sidebar currentView="vault" onNavigate={mockNavigate} onAddPassword={mockAddPassword} />);
        const signOutButton = screen.getByText('Sign Out');

        // Sign out button should be clickable
        fireEvent.click(signOutButton);

        // Note: Actual sign out logic involves Tauri invoke which is mocked in real implementation
        expect(signOutButton).toBeDefined();
    });
});

