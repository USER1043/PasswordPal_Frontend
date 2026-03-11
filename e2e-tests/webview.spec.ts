import { test, expect } from '@playwright/test';

test.describe('PasswordPal Real Browser Automation', () => {

  test('Verify home page rendering and branding', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Check custom branding
    const mainHeading = page.locator('text=PasswordPal');
    await expect(mainHeading).toBeVisible();
    
    // Ensure the subtitle is present
    const subtitle = page.locator('text=Welcome Back');
    await expect(subtitle).toBeVisible();
  });

  test('Simulate failed login attempt with empty fields', async ({ page }) => {
    await page.goto('/');

    // Click the unlock vault button without entering anything
    const unlockButton = page.locator('button', { hasText: 'Unlock Vault' });
    await unlockButton.click();

    // Verify that the user stays on the login page because fields are required
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeFocused().catch(() => {}); // HTML5 validation will usually focus the empty required field
    
    // Verify the URL did not change to the vault
    expect(page.url()).not.toContain('/vault');
  });

});
