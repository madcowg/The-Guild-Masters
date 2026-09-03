import { test, expect } from '@playwright/test';

test('landing page loads with guild heading and sign-up flow', async ({ page }) => {
  await page.goto('/');

  // With no Supabase/Stripe env vars configured, the app steps aside from
  // the real-backend auth gate and renders its own mock landing screen
  // (see src/App.jsx / src/auth/SupabaseAuthContext.jsx).
  await expect(page.getByRole('heading', { name: 'The Guild Masters' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send verification code' })).toBeVisible();
});
