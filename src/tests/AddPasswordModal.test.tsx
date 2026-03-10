import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddPasswordModal from '../components/AddPasswordModal';
import type { PasswordData } from '../components/AddPasswordModal';

describe('AddPasswordModal Component', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    beforeEach(() => {
        mockOnClose.mockClear();
        mockOnSave.mockClear();
    });

    // Basic Rendering Tests
    it('renders modal when isOpen is true', () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        expect(screen.getByText('Add New Password')).toBeDefined();
    });

    it('does not render when isOpen is false', () => {
        render(
            <AddPasswordModal
                isOpen={false}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        expect(screen.queryByText('Add New Password')).toBeNull();
    });

    it('renders Edit Password title when editData is provided', () => {
        const editData: PasswordData = {
            id: '1',
            name: 'GitHub',
            username: 'user@example.com',
            password: 'password123',
            url: 'https://github.com',
            folder: 'Work',
            notes: 'Test notes'
        };

        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
                editData={editData}
            />
        );

        expect(screen.getByText('Edit Password')).toBeDefined();
    });

    // Form Interaction Tests
    it('allows user to input password name', () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const nameInput = screen.getByPlaceholderText('e.g., GitHub, Gmail, Netflix') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: 'GitHub' } });

        expect(nameInput.value).toBe('GitHub');
    });

    it('allows user to input username', () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const usernameInput = screen.getByPlaceholderText('user@example.com') as HTMLInputElement;
        fireEvent.change(usernameInput, { target: { value: 'test@example.com' } });

        expect(usernameInput.value).toBe('test@example.com');
    });

    it('allows user to input password', () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const passwordInput = screen.getByPlaceholderText('Enter password') as HTMLInputElement;
        fireEvent.change(passwordInput, { target: { value: 'SecurePassword123!' } });

        expect(passwordInput.value).toBe('SecurePassword123!');
    });

    // Button Click Tests
    it('calls onClose when Cancel button is clicked', () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when X button is clicked', () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        // Find X button by looking for the close button in header
        const closeButtons = screen.getAllByRole('button');
        const xButton = closeButtons.find(btn => btn.querySelector('svg'));

        if (xButton) {
            fireEvent.click(xButton);
            expect(mockOnClose).toHaveBeenCalled();
        }
    });

    it('generates password when generate button is clicked', () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const passwordInput = screen.getByPlaceholderText('Enter password') as HTMLInputElement;
        const initialValue = passwordInput.value;

        // Find generate button (RefreshCw icon)
        const buttons = screen.getAllByRole('button');
        const generateButton = buttons.find(btn =>
            btn.getAttribute('title') === 'Generate password'
        );

        if (generateButton) {
            fireEvent.click(generateButton);
            expect(passwordInput.value).not.toBe(initialValue);
            expect(passwordInput.value.length).toBeGreaterThan(0);
        }
    });

    it('toggles password visibility when eye button is clicked', () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const passwordInput = screen.getByPlaceholderText('Enter password') as HTMLInputElement;
        fireEvent.change(passwordInput, { target: { value: 'TestPassword' } });

        // Initially password type
        expect(passwordInput.type).toBe('password');

        // Find show/hide button
        const buttons = screen.getAllByRole('button');
        const toggleButton = buttons.find(btn =>
            btn.getAttribute('title') === 'Show' || btn.getAttribute('title') === 'Hide'
        );

        if (toggleButton) {
            fireEvent.click(toggleButton);
            expect(passwordInput.type).toBe('text');

            fireEvent.click(toggleButton);
            expect(passwordInput.type).toBe('password');
        }
    });

    // Edge Case: Form Validation
    it('shows alert when saving with empty required fields', () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);

        expect(alertSpy).toHaveBeenCalledWith('Please fill in required fields');
        expect(mockOnSave).not.toHaveBeenCalled();

        alertSpy.mockRestore();
    });

    it('calls onSave with form data when all required fields are filled', async () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        // Fill required fields
        fireEvent.change(screen.getByPlaceholderText('e.g., GitHub, Gmail, Netflix'), {
            target: { value: 'GitHub' }
        });
        fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
            target: { value: 'user@github.com' }
        });
        fireEvent.change(screen.getByPlaceholderText('Enter password'), {
            target: { value: 'SecurePass123!' }
        });

        const saveButton = screen.getByText('Save');
        fireEvent.click(saveButton);

        // handleSubmit is async (awaits breach check) — must waitFor the callback
        await waitFor(() => {
            expect(mockOnSave).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'GitHub',
                    username: 'user@github.com',
                    password: 'SecurePass123!'
                })
            );
        });
        expect(mockOnClose).toHaveBeenCalled();
    });


    // Edge Case: Password Strength Calculation
    it('calculates password strength correctly', async () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const passwordInput = screen.getByPlaceholderText('Enter password') as HTMLInputElement;

        // Weak password
        fireEvent.change(passwordInput, { target: { value: 'weak' } });
        const weakLabel = await screen.findByText('Weak');
        expect(weakLabel).toBeDefined();

        // Medium password
        fireEvent.change(passwordInput, { target: { value: 'MediumPass123' } });
        const mediumLabel = await screen.findByText('Medium');
        expect(mediumLabel).toBeDefined();

        // Strong password
        fireEvent.change(passwordInput, { target: { value: 'StrongPass123!@#' } });
        const strongLabel = await screen.findByText('Strong');
        expect(strongLabel).toBeDefined();
    });

    // Edge Case: Folder Creation
    it('allows creating a new folder', () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const folderSelect = screen.getByDisplayValue('No Folder') as HTMLSelectElement;

        // Select "Create New Folder"
        fireEvent.change(folderSelect, { target: { value: '__create_new__' } });

        // New folder input should appear
        const newFolderInput = screen.getByPlaceholderText('Enter folder name') as HTMLInputElement;
        expect(newFolderInput).toBeDefined();

        // Enter folder name
        fireEvent.change(newFolderInput, { target: { value: 'Custom Folder' } });

        // Click Create button
        const createButton = screen.getByText('Create');
        fireEvent.click(createButton);

        // Folder should be created and selected
        expect(screen.queryByPlaceholderText('Enter folder name')).toBeNull();
    });

    // Edge Case: Empty Folder Name
    it('does not create folder with empty name', () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const folderSelect = screen.getByDisplayValue('No Folder') as HTMLSelectElement;
        fireEvent.change(folderSelect, { target: { value: '__create_new__' } });

        const newFolderInput = screen.getByPlaceholderText('Enter folder name') as HTMLInputElement;
        fireEvent.change(newFolderInput, { target: { value: '   ' } }); // Only spaces

        const createButton = screen.getByText('Create');
        fireEvent.click(createButton);

        // Should still show input (folder not created)
        expect(screen.getByPlaceholderText('Enter folder name')).toBeDefined();
    });

    // Edge Case: Cancel Folder Creation
    it('cancels folder creation when Cancel button is clicked', () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const folderSelect = screen.getByDisplayValue('No Folder') as HTMLSelectElement;
        fireEvent.change(folderSelect, { target: { value: '__create_new__' } });

        const cancelFolderButton = screen.getAllByText('Cancel').find(btn =>
            btn.closest('div')?.querySelector('input[placeholder="Enter folder name"]')
        );

        if (cancelFolderButton) {
            fireEvent.click(cancelFolderButton);
            expect(screen.queryByPlaceholderText('Enter folder name')).toBeNull();
        }
    });

    // Edge Case: Very Long Input
    it('handles very long input values', () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const longString = 'A'.repeat(1000);

        const nameInput = screen.getByPlaceholderText('e.g., GitHub, Gmail, Netflix') as HTMLInputElement;
        fireEvent.change(nameInput, { target: { value: longString } });

        expect(nameInput.value).toBe(longString);
    });

    // Edge Case: Special Characters
    it('handles special characters in input fields', () => {
        render(
            <AddPasswordModal
                isOpen={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
            />
        );

        const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';

        const passwordInput = screen.getByPlaceholderText('Enter password') as HTMLInputElement;
        fireEvent.change(passwordInput, { target: { value: specialChars } });

        expect(passwordInput.value).toBe(specialChars);
    });
});
