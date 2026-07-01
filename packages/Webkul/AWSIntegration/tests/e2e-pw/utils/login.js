// utils/login.js
import { expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const DEBUG_DIR = path.resolve(process.cwd(), 'debug');

function ensureDebugDir() {
  if (!fs.existsSync(DEBUG_DIR)) {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
  }
}

/**
 * Dump HTML + screenshot for debugging
 */
async function dumpDebug(page, label) {
  try {
    ensureDebugDir();

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base = path.join(DEBUG_DIR, `${label}-${stamp}`);

    const html = await page.content().catch(() => '(could not read page content)');
    fs.writeFileSync(`${base}.html`, html, 'utf8');

    await page
      .screenshot({
        path: `${base}.png`,
        fullPage: true,
        timeout: 5000,
      })
      .catch(() => {});

    return base;
  } catch {
    return null;
  }
}

/**
 * Reliable fill for Vue hydration race conditions
 */
async function reliableFill(locator, value, { attempts = 5 } = {}) {
  for (let i = 0; i < attempts; i++) {
    await locator.click({ timeout: 5000 }).catch(() => {});
    await locator.press('Control+A').catch(() => {});
    await locator.press('Delete').catch(() => {});
    await locator.pressSequentially(value, { delay: 15 });

    const actual = await locator.inputValue();
    if (actual === value) return;

    await locator.page().waitForTimeout(300);
  }

  const actual = await locator.inputValue();
  throw new Error(`reliableFill failed — expected "${value}", got "${actual}"`);
}

/**
 * Login helper
 */
export async function login(page) {
  const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8000';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  // open dashboard directly
  await page.goto(`${baseURL}/admin/dashboard`, {
    waitUntil: 'load',
    timeout: 60000,
  });

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(1500);

  // already logged in
  if (page.url().includes('/admin/dashboard')) {
    console.log('✓ Already logged in');
    return;
  }

  // validate redirect
  if (!page.url().includes('/admin/login')) {
    const dumped = await dumpDebug(page, 'login-unexpected-url');

    throw new Error(
      `Expected /admin/login but got:\n` +
        `URL: ${page.url()}\n` +
        `Debug: ${dumped ? dumped + '.{html,png}' : '(none)'}`
    );
  }

  // wait form
  const formSelector =
    '[action*="/admin/login"], v-form[action*="/admin/login"]';

  const form = page.locator(formSelector).first();

  try {
    await form.waitFor({
      state: 'attached',
      timeout: 30000,
    });
  } catch (err) {
    const dumped = await dumpDebug(page, 'login-form-missing');

    throw new Error(
      `Login form not found.\n` +
        `URL: ${page.url()}\n` +
        `Debug: ${dumped ? dumped + '.{html,png}' : '(none)'}\n` +
        `Error: ${err.message}`
    );
  }

  const emailField = page.locator('input[name="email"]');
  const passwordField = page.locator('input[name="password"]');

  await emailField.waitFor({
    state: 'visible',
    timeout: 30000,
  });

  await passwordField.waitFor({
    state: 'visible',
    timeout: 30000,
  });

  // Vue settle
  await page.waitForTimeout(1000);

  // fill credentials
  try {
    await reliableFill(emailField, email);
    await reliableFill(passwordField, password);
  } catch (err) {
    const dumped = await dumpDebug(page, 'login-fill-failed');

    throw new Error(
      `Could not fill login form.\n` +
        `${err.message}\n` +
        `Debug: ${dumped ? dumped + '.{html,png}' : '(none)'}`
    );
  }

  await expect(emailField).toHaveValue(email);
  await expect(passwordField).toHaveValue(password);

  // submit
  const [loginResponse] = await Promise.all([
    page
      .waitForResponse(
        (res) =>
          res.url().includes('/admin/login') &&
          res.request().method() === 'POST',
        { timeout: 30000 }
      )
      .catch(() => null),

    page.evaluate(
      ({ emailValue, passwordValue }) => {
        const realForm = document.querySelector(
          'form[action*="/admin/login"]'
        );

        if (realForm && typeof realForm.submit === 'function') {
          realForm.submit();
          return;
        }

        const vForm = document.querySelector('[action*="/admin/login"]');
        const action =
          vForm?.getAttribute('action') ||
          `${location.origin}/admin/login`;

        const tokenInput = document.querySelector(
          'input[name="_token"]'
        );

        const metaToken = document
          .querySelector('meta[name="csrf-token"]')
          ?.getAttribute('content');

        const token = tokenInput?.value || metaToken || '';

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = action;

        const add = (name, value) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = name;
          input.value = value;
          form.appendChild(input);
        };

        add('_token', token);
        add('email', emailValue);
        add('password', passwordValue);

        document.body.appendChild(form);
        form.submit();
      },
      {
        emailValue: email,
        passwordValue: password,
      }
    ),
  ]);

  // wait redirect properly
  await page
    .waitForURL('**/admin/dashboard', {
      timeout: 30000,
    })
    .catch(() => {});

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(2000);

  // SUCCESS
  if (page.url().includes('/admin/dashboard')) {
    console.log('✓ Login successful');
    return;
  }

  // FAILED
  const errorTexts = await page
    .locator(
      '.text-red-600, .text-red-500, .text-danger, .error-message, ' +
        '[role="alert"], .alert, .toast, span[class*="error"]'
    )
    .allTextContents()
    .catch(() => []);

  const dumped = await dumpDebug(page, 'login-failed');

  throw new Error(
    `Login failed.\n` +
      `Current URL: ${page.url()}\n` +
      `POST status: ${loginResponse?.status() ?? '(no response)'}\n` +
      `POST redirect: ${loginResponse?.headers()?.location ?? '(none)'}\n` +
      `Error texts: ${JSON.stringify(errorTexts)}\n` +
      `Credentials: ${email} / ${password}\n` +
      `Debug: ${dumped ? dumped + '.{html,png}' : '(none)'}`
  );
}
