import { test, expect } from '@playwright/test';

test.describe('PasswordPal Webview E2E', () => {
  test('should load the application root', async ({ page }) => {
    // Navigate to the local development server (Playwright will start it via webServer config)
    await page.goto('/');

    // Verify the page title or a key branding element
    await expect(page).toHaveTitle(/PasswordPal/i);
    const heading = page.locator('h1', { hasText: 'PasswordPal' });
    await expect(heading).toBeVisible();
  });

  test('should show login form initially', async ({ page }) => {
    await page.goto('/');

    // Verify the fundamental UI components of the Login page load
    const welcomeHeader = page.locator('h2', { hasText: 'Welcome Back' });
    await expect(welcomeHeader).toBeVisible();

    // Verify email and password fields exist
    const emailField = page.locator('input[placeholder="you@example.com"]');
    const passwordField = page.locator('input[placeholder="Enter your master password"]');
    await expect(emailField).toBeVisible();
    await expect(passwordField).toBeVisible();

    // Verify submit button is available
    const submitButton = page.locator('button', { hasText: 'Unlock Vault' });
    await expect(submitButton).toBeVisible();
  });
});
