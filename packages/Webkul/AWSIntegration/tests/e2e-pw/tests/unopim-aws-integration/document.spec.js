import { test, expect } from '@playwright/test';

/**
 * UnoPIM AWS S3 Integration — Documentation page UI tests.
 *
 * Route: /admin/aws/document  (aws.document.index)
 * View:  aws::index  (packages/Webkul/AWSIntegration/src/Resources/views/index.blade.php)
 *
 * Lang keys (en_US/app.php):
 *   aws.document.index.title        → "AWS S3 Documentation"
 *   aws.document.setup.title        → "How to Set Up"
 *   aws.document.setup.steps.step1  → "Create an S3 bucket in your AWS account."
 *   aws.document.setup.steps.step2  → "Generate Access Key and Secret Key from IAM."
 *   aws.document.setup.steps.step3  → "Configure AWS credentials in UnoPim."
 *   aws.document.migration.title    → "Migrate Existing Media to AWS S3"
 */

const ROUTES = {
  dashboard: '/admin/dashboard',
  document:  '/admin/aws/document',
};

test.describe('UnoPIM AWS S3 Integration — Documentation UI Tests', () => {

  test('AWS S3 module should be visible in sidebar', async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await expect(page.getByRole('link', { name: /AWS S3/i }).first()).toBeVisible();
  });

  test('AWS S3 icon should be visible in sidebar', async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await expect(page.locator('span.icon-AwsS3').first()).toBeVisible();
  });

  test('AWS S3 menu should be clickable', async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await page.getByRole('link', { name: /AWS S3/i }).first().click();
    await expect(page.getByRole('link', { name: 'Documentation' })).toBeVisible();
  });

  test('"Documentation" option should be visible under AWS S3', async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await page.getByRole('link', { name: /AWS S3/i }).first().click();
    await expect(page.getByRole('link', { name: 'Documentation' })).toBeVisible();
  });

  test('"Documentation" option should be clickable and navigate', async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await page.getByRole('link', { name: /AWS S3/i }).first().click();
    await page.getByRole('link', { name: 'Documentation' }).click();
    await expect(page).toHaveURL(/.*\/admin\/aws\/document/);
  });

  test('Should navigate directly to Documentation page and verify URL', async ({ page }) => {
    await page.goto(ROUTES.document, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveURL(/.*\/admin\/aws\/document/);
  });

  test('Should display the "AWS S3 Documentation" heading', async ({ page }) => {
    await page.goto(ROUTES.document);
    await expect(page.getByText(/AWS S3 Documentation/i).first()).toBeVisible();
  });

  test('Should display "How to Set Up" section', async ({ page }) => {
    await page.goto(ROUTES.document);
    await expect(page.getByText(/How to Set Up/i).first()).toBeVisible();
  });

  test('Should display step-by-step setup instructions (step1..step3 content)', async ({ page }) => {
    await page.goto(ROUTES.document);
    await expect(page.getByText(/Create an S3 bucket in your AWS account/i)).toBeVisible();
    await expect(page.getByText(/Generate Access Key and Secret Key from IAM/i)).toBeVisible();
    await expect(page.getByText(/Configure AWS credentials in UnoPim/i)).toBeVisible();
  });

  test('Should display the "Migrate Existing Media to AWS S3" section', async ({ page }) => {
    await page.goto(ROUTES.document);
    await expect(page.getByText(/Migrate Existing Media to AWS S3/i)).toBeVisible();
  });

  // test('Should display the move_existing_files artisan command', async ({ page }) => {
  //   await page.goto(ROUTES.document);
  //   // Console/Commands/MoveExistingFilesToS3.php signature
  //   await expect(
  //     page.locator('text=/php artisan (aws[_-]integration:move[_-]existing[_-]files|aws:move[_-]existing[_-]files)/i').first()
  //   ).toBeVisible();
  // });

  // test('Should display the remove_media_files artisan command', async ({ page }) => {
  //   await page.goto(ROUTES.document);
  //   await expect(
  //     page.locator('text=/php artisan (aws[_-]integration:remove[_-]media[_-]files|aws:remove[_-]media[_-]files)/i').first()
  //   ).toBeVisible();
  // });
});
