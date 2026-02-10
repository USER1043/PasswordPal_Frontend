
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ToastContainer from '../components/ToastContainer';
import { NotificationProvider, useNotification } from '../context/NotificationContext';

// Helper component to trigger toasts
const TestTrigger = ({ message, type }: { message: string, type: 'success' | 'error' }) => {
    const { success, error } = useNotification();
    return (
        <div>
            <button onClick={() => success(message)}>Trigger Success</button>
            <button onClick={() => error(message)}>Trigger Error</button>
        </div>
    );
};

describe('Toast Notification System', () => {
    it('renders nothing initially', () => {
        render(
            <NotificationProvider>
                <ToastContainer />
            </NotificationProvider>
        );
        const toasts = screen.queryByRole('alert');
        expect(toasts).toBeNull();
    });

    it('renders success toast when triggered', async () => {
        render(
            <NotificationProvider>
                <ToastContainer />
                <TestTrigger message="Success Message" type="success" />
            </NotificationProvider>
        );

        fireEvent.click(screen.getByText('Trigger Success'));

        // We expect the toast to appear
        const toast = await screen.findByText('Success Message');
        expect(toast).toBeDefined();
    });

    it('renders error toast when triggered', async () => {
        render(
            <NotificationProvider>
                <ToastContainer />
                <TestTrigger message="Error Message" type="error" />
            </NotificationProvider>
        );

        fireEvent.click(screen.getByText('Trigger Error'));

        const toast = await screen.findByText("Error Message");
        expect(toast).toBeDefined();
    });
});
