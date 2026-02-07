import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/Sidebar';

// Lucide icons will be rendered as SVGs by jsdom, no need to mock for basic visibility


describe('Sidebar Component', () => {
    const mockNavigate = vi.fn();

    it('renders branding correctly', () => {
        render(<Sidebar currentView="vault" onNavigate={mockNavigate} />);
        expect(screen.getByText('PasswordPal')).toBeDefined();
        // Check if SVG exists (lucide icons render as svgs)
        expect(document.querySelector('svg')).not.toBeNull();
    });

    it('renders all navigation items', () => {
        render(<Sidebar currentView="vault" onNavigate={mockNavigate} />);
        expect(screen.getByText('My Vault')).toBeDefined();
        expect(screen.getByText('Generator')).toBeDefined();
        expect(screen.getByText('Security')).toBeDefined();
        expect(screen.getByText('Settings')).toBeDefined();
    });

    it('highlights the current view', () => {
        render(<Sidebar currentView="generator" onNavigate={mockNavigate} />);
        const generatorButton = screen.getByText('Generator').closest('button');
        expect(generatorButton?.className).toContain('bg-purple-500/10');
    });

    it('calls onNavigate when a menu item is clicked', () => {
        render(<Sidebar currentView="vault" onNavigate={mockNavigate} />);
        fireEvent.click(screen.getByText('Settings'));
        expect(mockNavigate).toHaveBeenCalledWith('settings');
    });

    it('renders sign out button', () => {
        render(<Sidebar currentView="vault" onNavigate={mockNavigate} />);
        expect(screen.getByText('Sign Out')).toBeDefined();
    });
});
