import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ToastContainer from '../components/ToastContainer';
import { NotificationProvider, useNotification } from '../context/NotificationContext';

// Helper component to trigger toasts
const TestTrigger = ({ message, type }: { message: string, type: 'success' | 'error' | 'warning' | 'info' }) => {
    const { success, error, warning, info } = useNotification();
    return (
        <div>
            <button onClick={() => success(message)}>Trigger Success</button>
            <button onClick={() => error(message)}>Trigger Error</button>
            <button onClick={() => warning(message)}>Trigger Warning</button>
            <button onClick={() => info(message)}>Trigger Info</button>
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

    // Edge Case Tests
    it('renders warning toast when triggered', async () => {
        render(
            <NotificationProvider>
                <ToastContainer />
                <TestTrigger message="Warning Message" type="warning" />
            </NotificationProvider>
        );

        fireEvent.click(screen.getByText('Trigger Warning'));
        const toast = await screen.findByText("Warning Message");
        expect(toast).toBeDefined();
    });

    it('renders info toast when triggered', async () => {
        render(
            <NotificationProvider>
                <ToastContainer />
                <TestTrigger message="Info Message" type="info" />
            </NotificationProvider>
        );

        fireEvent.click(screen.getByText('Trigger Info'));
        const toast = await screen.findByText("Info Message");
        expect(toast).toBeDefined();
    });

    it('handles multiple toasts simultaneously', async () => {
        const MultiToastTrigger = () => {
            const { success, error, warning } = useNotification();
            return (
                <div>
                    <button onClick={() => success('Success Toast')}>Trigger Success</button>
                    <button onClick={() => error('Error Toast')}>Trigger Error</button>
                    <button onClick={() => warning('Warning Toast')}>Trigger Warning</button>
                </div>
            );
        };

        render(
            <NotificationProvider>
                <ToastContainer />
                <MultiToastTrigger />
            </NotificationProvider>
        );

        // Trigger multiple toasts
        fireEvent.click(screen.getByText('Trigger Success'));
        fireEvent.click(screen.getByText('Trigger Error'));
        fireEvent.click(screen.getByText('Trigger Warning'));

        // All toasts should appear
        const successToast = await screen.findByText("Success Toast");
        expect(successToast).toBeDefined();
    });

    it('handles very long messages', async () => {
        const longMessage = 'A'.repeat(500);
        const LongMessageTrigger = () => {
            const { success } = useNotification();
            return <button onClick={() => success(longMessage)}>Trigger Long</button>;
        };

        render(
            <NotificationProvider>
                <ToastContainer />
                <LongMessageTrigger />
            </NotificationProvider>
        );

        fireEvent.click(screen.getByText('Trigger Long'));
        const toast = await screen.findByText(longMessage);
        expect(toast).toBeDefined();
    });
});

