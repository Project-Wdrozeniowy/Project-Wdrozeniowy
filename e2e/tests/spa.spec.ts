import { spawnSync } from 'node:child_process';
import { test, expect, signIn, apiResponse, apiSignIn } from '../support/fixtures.js';

// Migration parity for an already reachable flow, not full PWDRZ-67 acceptance.
test('SPA: the existing comment flow keeps working on the dynamic post route', async ({
  page,
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const created = await request.post('/api/forum/posts', {
    headers,
    data: {
      title: `Comment parity ${account.username}`,
      content: 'A real published post for existing comment routing parity.',
      categoryId: 1,
    },
  });
  expect(created.status()).toBe(201);
  const post = await created.json();
  await signIn(page, account);
  await page.goto(`/forum/${post.slug}`);
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  const content = `Persisted comment ${account.username}`;
  await page.getByLabel('Add a comment', { exact: true }).fill(content);
  const saved = apiResponse(page, `/forum/posts/${post.slug}/comments`, 'POST');
  await page.getByRole('button', { name: 'Post comment', exact: true }).click();
  expect((await saved).status()).toBe(201);
  await expect(page.getByText(content, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(content, { exact: true })).toBeVisible();
});

test('SPA: production assets, fallback and API failures retain their boundaries', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('/forum/deep-link');
  expect(response?.status()).toBe(200);
  await expect(page.getByText('Post slug: deep-link')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Post slug: deep-link')).toBeVisible();
  expect(response?.headers()['cache-control']).toBe('no-cache');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");

  const sources = await page
    .locator('script[src], link[rel="stylesheet"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('src') ?? node.getAttribute('href')!)
    );
  expect(sources.length).toBeGreaterThan(0);
  for (const source of sources) {
    expect(source).toMatch(/^\/assets\//);
    const asset = await request.get(source);
    expect(asset.status()).toBe(200);
    expect(asset.headers()['content-type']).toMatch(/javascript|text\/css/);
    expect(asset.headers()['cache-control']).toContain('immutable');
  }
  for (const path of ['/assets/missing.js', '/missing.css']) {
    const missing = await request.get(path, { headers: { Accept: 'text/html' } });
    expect(missing.status()).toBe(404);
    expect(missing.headers()['content-type']).not.toContain('text/html');
  }
  const unknownApi = await request.get('/api/spike-unknown', {
    headers: { Accept: 'text/html' },
  });
  expect(unknownApi.status()).toBe(404);
  expect(unknownApi.headers()['content-type']).toContain('application/problem+json');
  const wrongMethod = await request.post('/forum', { headers: { Accept: 'text/html' } });
  expect(wrongMethod.status()).toBe(404);
  await page.goto('/spike-unknown');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Return home' }).click();
  await expect(page.getByRole('banner')).toBeVisible();
  expect(errors).toEqual([]);
});

test('SPA: query pagination, history and category filters survive navigation and reload', async ({
  page,
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);

  const categories = await (await request.get('/api/forum/categories')).json();
  const tag = `spike-${account.username.slice(-10)}`;
  for (let index = 0; index < 11; index++) {
    const created = await request.post('/api/forum/posts', {
      headers,
      data: {
        title: `SPA ${tag} ${index}`,
        content: 'A persisted pagination fixture for the migration spike.',
        categoryId: categories[0].id,
        tags: [tag],
      },
    });
    expect(created.status()).toBe(201);
  }
  await page.goto(`/forum?tag=${tag}`);
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(`/forum?tag=${tag}&page=2`);
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeEnabled();
  await page.goBack();
  await expect(page).toHaveURL(`/forum?tag=${tag}`);
  await page.goForward();
  await expect(page).toHaveURL(`/forum?tag=${tag}&page=2`);
  const gaming = page.getByRole('button', { name: 'Gaming', exact: true });
  await gaming.focus();
  await gaming.press('Enter');
  await expect(gaming).toBeFocused();
  await expect(page).toHaveURL(`/forum?tag=${tag}&topic=Gaming`);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Gaming', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await page.goto(`/search?q=${account.username}`);
  await page
    .getByRole('navigation', { name: 'Result kinds' })
    .getByRole('link', { name: 'Users' })
    .click();
  await expect(page).toHaveURL(`/search?q=${account.username}&type=USER`);
  await page.reload();
  await expect(page.getByText(`@${account.username}`)).toBeVisible();
  await page.goto('/forum#spike-anchor');
  await expect(page.getByRole('heading', { name: 'Forum', exact: true })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL('/forum#spike-anchor');
  await page.getByRole('banner').getByRole('link', { name: 'Home', exact: true }).click();
  await page.getByRole('banner').getByRole('link', { name: 'Forum', exact: true }).click();
  await expect(page.locator('main').first()).toBeFocused();
});

test('SPA: guest and user guards, same-origin session cookies and protected reloads', async ({
  page,
  context,
  account,
}) => {
  for (const path of ['/profile', '/settings', '/dashboard', '/admin']) {
    await page.goto(path);
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  }
  await signIn(page, account);
  const cookies = await context.cookies();
  expect(
    cookies.some(
      (cookie) =>
        cookie.name === 'SESSION' &&
        cookie.httpOnly &&
        cookie.sameSite === 'Strict' &&
        cookie.path === '/' &&
        cookie.expires === -1
    )
  ).toBe(true);
  for (const path of ['/profile', '/settings', '/dashboard']) {
    await page.goto(path);
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    await expect(page).toHaveURL(path);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    await expect(page).toHaveURL(path);
  }
  await page.goto('/admin');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      [...Object.values(localStorage), ...Object.values(sessionStorage)].some((value) =>
        /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./.test(value)
      )
    )
  ).toBe(false);
});

test('SPA: an administrator can open and reload the existing admin layout', async ({
  page,
  account,
}, testInfo) => {
  // Test data only: promote this synthetic account in the launcher's disposable DB.
  // No production endpoint, role bypass or application code is added for this fixture.
  const project = process.env.E2E_PROJECT ?? '';
  if (
    !/^orbita-e2e-\d+-[a-f0-9]{8}$/.test(project) ||
    !/^e2e_[a-f0-9]{20}$/.test(account.username)
  ) {
    throw new Error('Refusing an admin fixture outside the managed E2E project');
  }
  const seeded = spawnSync(
    'docker',
    [
      'compose',
      '-f',
      'compose.yml',
      '-p',
      project,
      'exec',
      '-T',
      'postgres',
      'psql',
      '-U',
      'orbita_e2e',
      '-d',
      'orbita_e2e',
      '-v',
      'ON_ERROR_STOP=1',
    ],
    {
      input: `UPDATE users SET role = 'ADMIN' WHERE username = '${account.username}';\n`,
      encoding: 'utf8',
      timeout: 10_000,
      windowsHide: true,
    }
  );
  expect(seeded.status, seeded.stderr).toBe(0);
  expect(seeded.stdout).toContain('UPDATE 1');
  await signIn(page, account);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();
  await testInfo.attach('admin-desktop', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('SPA: representative layouts remain usable at desktop and narrow widths', async ({
  page,
  account,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      throw new Error(`CSP violation: ${event.violatedDirective}`);
    });
  });
  for (const path of ['/login', '/register']) {
    await page.goto(path);
    await expect(page.locator('form')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await testInfo.attach(`${path.slice(1)}-desktop`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  }
  await signIn(page, account);
  for (const path of ['/', '/forum', '/search?q=spike', '/profile', '/settings']) {
    await page.goto(path);
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    if (path === '/settings')
      await expect(page.getByRole('form', { name: 'Account settings' })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await testInfo.attach(`${path.split('?')[0].slice(1) || 'home'}-desktop`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/forum', '/settings']) {
    await page.goto(path);
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    if (path === '/settings')
      await expect(page.getByRole('form', { name: 'Account settings' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    await testInfo.attach(`${path.slice(1)}-mobile`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  }
  expect(errors).toEqual([]);
});
