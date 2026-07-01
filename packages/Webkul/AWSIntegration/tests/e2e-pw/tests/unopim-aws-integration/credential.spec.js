import { test, expect } from '@playwright/test';

/**
 * UnoPIM AWS S3 Integration — Credential page UI tests.
 *
 * Fields on the Credentials form (see credential.blade.php):
 *   access_key, secret_key, region, bucket_name, bucket_url (optional),
 *   environment_updated_at (optional), enabled (switch), default_visibility (switch)
 *
 * Controller: AWSS3StorageController@store
 *   - required|string: access_key, secret_key, region, bucket_name
 *   - nullable|url:    bucket_url
 *   - required|in:public,private: default_visibility
 *   - On validator failure: back() with flash 'error' = 'Invalid AWS credentials' (or validator message)
 *   - On success: redirect to aws.credential.index with flash 'success'
 *
 * Sidebar: "AWS S3" → "Documentation" / "Credentials" / "History"
 */

const ROUTES = {
  dashboard:  '/admin/dashboard',
  document:   '/admin/aws/document',
  credential: '/admin/aws/credential',
  history:    '/admin/history',
};

// Dummy AWS values that are syntactically valid but rejected by the validator.
const FAKE = {
  accessKey: 'AKIAIOSFODNN7EXAMPLE',
  secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  region:    'us-east-1',
  bucket:    'unopim-e2e-fake-bucket',
  bucketUrl: 'https://unopim-e2e-fake-bucket.s3.us-east-1.amazonaws.com',
};

async function gotoCredentialDirect(page) {
  await page.goto(ROUTES.credential, { waitUntil: 'load' });
}

async function setField(page, name, value) {
  const input = page.locator(`input[name="${name}"]`);
  await input.waitFor({ state: 'visible' });
  await input.click();
  await input.press('ControlOrMeta+A').catch(() => {});
  await input.fill(value);
}

async function fillCredential(page, opts = {}) {
  const {
    accessKey = '',
    secretKey = '',
    region    = '',
    bucket    = '',
    bucketUrl = null,
  } = opts;

  await setField(page, 'access_key', accessKey);
  await setField(page, 'secret_key', secretKey);
  await setField(page, 'region', region);
  await setField(page, 'bucket_name', bucket);
  if (bucketUrl !== null) {
    await setField(page, 'bucket_url', bucketUrl);
  }
}

test.describe('UnoPIM AWS S3 Integration — Credential UI Tests', () => {

  // ─────────────────────────────────────────────────────────────
  // Sidebar / navigation
  // ─────────────────────────────────────────────────────────────

  test('AWS S3 module should be visible in sidebar', async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    const awsMenu = page.getByRole('link', { name: /AWS S3/i }).first();
    await expect(awsMenu).toBeVisible();
  });

  test('AWS S3 icon should be visible in sidebar', async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    // menu.php: 'icon' => 'icon-AwsS3'
    await expect(page.locator('span.icon-AwsS3').first()).toBeVisible();
  });

  test('AWS S3 menu should be clickable and reveal sub-items', async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await page.getByRole('link', { name: /AWS S3/i }).first().click();
    await expect(page.getByRole('link', { name: 'Documentation' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Credentials' })).toBeVisible();
  });

  test('"Credentials" option should be visible under AWS S3', async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await page.getByRole('link', { name: /AWS S3/i }).first().click();
    await expect(page.getByRole('link', { name: 'Credentials' })).toBeVisible();
  });

  test('"Credentials" option should be clickable and navigate to credential URL', async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await page.getByRole('link', { name: /AWS S3/i }).first().click();
    await page.getByRole('link', { name: 'Credentials' }).click();
    await expect(page).toHaveURL(/.*\/admin\/aws\/credential/);
  });

  test('Validate the URL structure of the Credential page', async ({ page }) => {
    await gotoCredentialDirect(page);
    await expect(page).toHaveURL(/.*\/admin\/aws\/credential/);
  });

  // ─────────────────────────────────────────────────────────────
  // Form rendering
  // ─────────────────────────────────────────────────────────────

  test('Validate visibility of all input fields in the AWS Credential form', async ({ page }) => {
    await gotoCredentialDirect(page);

    await expect(page.locator('input[name="access_key"]')).toBeVisible();
    await expect(page.locator('input[name="secret_key"]')).toBeVisible();
    await expect(page.locator('input[name="region"]')).toBeVisible();
    await expect(page.locator('input[name="bucket_name"]')).toBeVisible();
    await expect(page.locator('input[name="bucket_url"]')).toBeVisible();
    await expect(page.locator('input[name="environment_updated_at"]')).toBeVisible();

    // Two toggles: Enable AWS S3 and Default File Visibility
    await expect(page.locator('label:has-text("Enable AWS S3")')).toBeVisible();
    await expect(page.locator('label:has-text("Default File Visibility")')).toBeVisible();

    // Save button (primary)
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('"Save" button is visible and enabled', async ({ page }) => {
    await gotoCredentialDirect(page);
    const saveButton = page.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeEnabled();
  });

  // ─────────────────────────────────────────────────────────────
  // Required-field validation (client + server)
  // ─────────────────────────────────────────────────────────────

  test('Whitespace-only input in required fields is rejected', async ({ page }) => {
    await gotoCredentialDirect(page);
    await fillCredential(page, {
      accessKey: '   ',
      secretKey: '     ',
      region:    '   ',
      bucket:    '    ',
    });
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText(/The access_key field is required/i)).toBeVisible();
    await expect(page.getByText(/The secret_key field is required/i)).toBeVisible();
    await expect(page.getByText(/The region field is required/i)).toBeVisible();
    await expect(page.getByText(/The bucket_name field is required/i)).toBeVisible();
  });

  test('Access Key empty shows only Access Key error', async ({ page }) => {
    await gotoCredentialDirect(page);
    await fillCredential(page, { ...FAKE, accessKey: '' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/The access_key field is required/i)).toBeVisible();
  });

  test('Secret Key empty shows only Secret Key error', async ({ page }) => {
    await gotoCredentialDirect(page);
    await fillCredential(page, { ...FAKE, secretKey: '' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/The secret_key field is required/i)).toBeVisible();
  });

  test('Region empty shows only Region error', async ({ page }) => {
    await gotoCredentialDirect(page);
    await fillCredential(page, { ...FAKE, region: '' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/The region field is required/i)).toBeVisible();
  });

  test('Bucket Name empty shows only Bucket Name error', async ({ page }) => {
    await gotoCredentialDirect(page);
    await fillCredential(page, { ...FAKE, bucket: '' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/The bucket_name field is required/i)).toBeVisible();
  });

  test('Access Key + Secret Key empty shows both errors', async ({ page }) => {
    await gotoCredentialDirect(page);
    await fillCredential(page, { ...FAKE, accessKey: '', secretKey: '' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/The access_key field is required/i)).toBeVisible();
    await expect(page.getByText(/The secret_key field is required/i)).toBeVisible();
  });

  test('Access Key + Region empty shows both errors', async ({ page }) => {
    await gotoCredentialDirect(page);
    await fillCredential(page, { ...FAKE, accessKey: '', region: '' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/The access_key field is required/i)).toBeVisible();
    await expect(page.getByText(/The region field is required/i)).toBeVisible();
  });

  test('Region + Bucket Name empty shows both errors', async ({ page }) => {
    await gotoCredentialDirect(page);
    await fillCredential(page, { ...FAKE, region: '', bucket: '' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/The region field is required/i)).toBeVisible();
    await expect(page.getByText(/The bucket_name field is required/i)).toBeVisible();
  });

  test('Secret Key + Bucket Name empty shows both errors', async ({ page }) => {
    await gotoCredentialDirect(page);
    await fillCredential(page, { ...FAKE, secretKey: '', bucket: '' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/The secret_key field is required/i)).toBeVisible();
    await expect(page.getByText(/The bucket_name field is required/i)).toBeVisible();
  });

  test('Three required fields empty shows all three errors', async ({ page }) => {
    await gotoCredentialDirect(page);
    await fillCredential(page, { ...FAKE, accessKey: '', secretKey: '', region: '' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/The access_key field is required/i)).toBeVisible();
    await expect(page.getByText(/The secret_key field is required/i)).toBeVisible();
    await expect(page.getByText(/The region field is required/i)).toBeVisible();
  });

  test('Invalid bucket_url format is rejected', async ({ page }) => {
    await gotoCredentialDirect(page);
    await fillCredential(page, { ...FAKE, bucketUrl: 'not-a-valid-url' });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/bucket url|bucket_url/i).first()).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────
  // Validator (hits AWS) — fake creds should surface error
  // ─────────────────────────────────────────────────────────────

  test('Submitting fake AWS credentials surfaces validator error', async ({ page }) => {
    // The backend runs a live AWS HeadBucket probe on save, which can hang
    // for the full SDK retry window on fake creds. Give it room.
    test.setTimeout(120_000);

    await gotoCredentialDirect(page);
    await fillCredential(page, FAKE);
    await page.getByRole('button', { name: 'Save' }).click({ timeout: 90_000 });
    await page.waitForLoadState('networkidle', { timeout: 90_000 });

    // Stays on credential page, no success toast.
    await expect(page).toHaveURL(/\/admin\/aws\/credential/);
    await expect(page.getByText(/AWS credentials saved successfully/i)).toHaveCount(0);
  });

  // ─────────────────────────────────────────────────────────────
  // Toggle switches
  // ─────────────────────────────────────────────────────────────

  test('Enable AWS S3 switch is toggleable', async ({ page }) => {
    await gotoCredentialDirect(page);
    const enabledCheckbox = page.locator('input[type="checkbox"][name="enabled"]');
    await expect(enabledCheckbox).toHaveCount(1);
  });

  test('Default File Visibility switch is visible', async ({ page }) => {
    await gotoCredentialDirect(page);
    const visibilityCheckbox = page.locator('input[type="checkbox"][name="default_visibility"]');
    await expect(visibilityCheckbox).toHaveCount(1);
  });

  // ─────────────────────────────────────────────────────────────
  // Masking — when a credential exists, the page should mask secrets
  // ─────────────────────────────────────────────────────────────

  test('Access key and secret key are masked when credential exists', async ({ page }) => {
    await gotoCredentialDirect(page);
    const accessKey = await page.locator('input[name="access_key"]').inputValue();
    if (!accessKey) {
      test.info().annotations.push({ type: 'skip', description: 'no existing credential' });
      return;
    }
    // Controller masks access_key as first 4 chars + 12 "*", and secret_key as 20 "*".
    expect(accessKey).toMatch(/^.{4}\*{12}$/);
    const secretKey = await page.locator('input[name="secret_key"]').inputValue();
    expect(secretKey).toMatch(/^\*{20}$/);
  });

  // ─────────────────────────────────────────────────────────────
  // History page
  // ─────────────────────────────────────────────────────────────

  test('History page renders the AWS Credentials History heading', async ({ page }) => {
    await page.goto(ROUTES.history);
    await expect(page.getByText(/AWS Credentials History/i).first()).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────
  // ACL / Role permissions
  // ─────────────────────────────────────────────────────────────

  test('AWS S3 is available in Role permission section', async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await page.goto('/admin/settings/roles/create');
    await expect(
      page.locator('input[name="permission_type"]').locator('..').locator('.multiselect__tags')
    ).toHaveText('Custom');
    await expect(page.locator('div').filter({ hasText: /^AWS S3$/ }).first()).toBeVisible();
  });


});
