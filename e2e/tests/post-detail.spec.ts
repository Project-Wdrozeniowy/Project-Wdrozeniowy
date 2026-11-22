import { test, expect, apiSignIn, signIn } from '../support/fixtures.js';

// PWDRZ-164: the readable post page on the real stack. The posts are made through the API; the rest
// is the real browser against the real backend. Hostile text must run nothing and load nothing.

const TRACKER = 'tracker.example';
const WIDE = 'x'.repeat(400);

test('a Markdown post is shown formatted, hostile text does nothing, and a phone does not scroll sideways', async ({
  page,
  request,
  account,
}, testInfo) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get('/api/forum/categories')).json();
  const title = `Markdown ${account.username}`;
  const content = [
    '# A heading',
    'Some **bold** words, `inline code` and a [safe link](https://example.com/page).',
    '| a | b |\n| - | - |\n| ' + WIDE + ' | 2 |',
    '```\nconst long = "' + WIDE + '";\n```',
    '<img src="x" onerror="window.__xss = 1">',
    '<script>window.__xss = 1</script>',
    '<iframe src="https://' + TRACKER + '/frame"></iframe>',
    '[click me](javascript:window.__xss=1)',
    '![pixel](https://' + TRACKER + '/pixel.png)',
  ].join('\n\n');
  const created = await request.post('/api/forum/posts', {
    headers,
    data: { title, content, categoryId: categories[0].id },
  });
  expect(created.status()).toBe(201);
  const { slug } = await created.json();

  // Anything that runs, pops up or reaches the tracker is a failure.
  const dialogs: string[] = [];
  const tracked: string[] = [];
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  page.on('request', (call) => {
    if (new URL(call.url()).hostname === TRACKER) tracked.push(call.url());
  });

  // A guest reads it.
  await page.goto(`/forum/${slug}`);
  const article = page.getByRole('article', { name: title });
  await expect(article).toBeVisible();

  // Formatted: one h1 (the title), the author's heading below it, bold, and a safe link.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(article.getByRole('heading', { level: 2, name: 'A heading' })).toBeVisible();
  await expect(article.locator('strong')).toHaveText('bold');
  const safe = article.getByRole('link', { name: 'safe link' });
  await expect(safe).toHaveAttribute('href', 'https://example.com/page');
  await expect(safe).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc');
  await expect(safe).toHaveAttribute('target', '_blank');

  // Inert: no script, frame or image in the post, the javascript link is text, the image is a link.
  await expect(article.locator('script, iframe, img, [onerror], [onclick]')).toHaveCount(0);
  await expect(article.getByRole('link', { name: 'click me' })).toHaveCount(0);
  await expect(article.getByText('click me')).toBeVisible();
  await expect(article.getByRole('link', { name: 'Image: pixel' })).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)
  ).toBeUndefined();
  expect(dialogs).toEqual([]);
  expect(tracked).toEqual([]);
  await testInfo.attach('1-desktop.png', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // The same body after a reload, and on a phone: the wide table and the long code line scroll in
  // their own boxes, the page itself does not.
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.reload();
    await expect(article).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
    const code = article.locator('pre');
    expect(await code.evaluate((box) => box.scrollWidth > box.clientWidth)).toBe(true);
    const table = article.locator('table');
    expect(
      await table.evaluate((t) => t.parentElement!.scrollWidth > t.parentElement!.clientWidth)
    ).toBe(true);
    // The scrolling boxes can be reached by keyboard.
    await code.focus();
    await expect(code).toBeFocused();
  }
  await testInfo.attach('2-phone.png', { body: await page.screenshot(), contentType: 'image/png' });
  expect(dialogs).toEqual([]);
  expect(tracked).toEqual([]);
});

test('a guest reads, a member comments, and the comment is there after a reload', async ({
  page,
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get('/api/forum/categories')).json();
  const title = `Discuss ${account.username}`;
  const created = await request.post('/api/forum/posts', {
    headers,
    data: { title, content: 'A post to **discuss**.', categoryId: categories[0].id },
  });
  expect(created.status()).toBe(201);
  const { slug } = await created.json();

  // A guest sees the post and the discussion, and is asked to sign in to join.
  await page.goto(`/forum/${slug}`);
  await expect(page.getByRole('article', { name: title })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Comments/ })).toBeVisible();
  await expect(page.getByLabel('Add a comment')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Sign in' }).last()).toBeVisible();

  // A member comments, by keyboard, and sees it at once.
  await signIn(page, account);
  await page.goto(`/forum/${slug}`);
  const text = `A comment from the browser ${account.username}`;
  await page.getByLabel('Add a comment').fill(text);
  await page.getByLabel('Add a comment').press('Tab');
  await page.getByRole('button', { name: 'Post comment' }).press('Enter');
  await expect(page.getByText(text)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comments (1 thread)' })).toBeVisible();
  await expect(
    page.getByRole('article', { name: title }).getByRole('link', { name: '1 Comment', exact: true })
  ).toBeVisible();

  // It is the server's: it is there after a reload.
  await page.reload();
  await expect(page.getByText(text)).toBeVisible();
});

test('the post opened from the search shows the same body as the direct address', async ({
  page,
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get('/api/forum/categories')).json();
  const word = `searchable${account.username.slice(-8)}`;
  const title = `Find ${word}`;
  const created = await request.post('/api/forum/posts', {
    headers,
    data: { title, content: 'The **same** persisted body.', categoryId: categories[0].id },
  });
  expect(created.status()).toBe(201);
  const { slug } = await created.json();

  await page.goto(`/search?q=${word}`);
  await page.getByRole('link', { name: title }).first().click();
  await expect(page).toHaveURL(new RegExp(`/forum/${slug}$`));
  const article = page.getByRole('article', { name: title });
  await expect(article).toContainText('The same persisted body.');
  await expect(article.locator('strong')).toHaveText('same');
  const fromSearch = await article.innerText();

  await page.goto(`/forum/${slug}`);
  await expect(page.getByRole('article', { name: title })).toBeVisible();
  expect(await page.getByRole('article', { name: title }).innerText()).toBe(fromSearch);
});

test('a missing post and a draft of someone else say "not found", and the author sees the draft', async ({
  page,
  request,
  account,
}) => {
  const headers = await apiSignIn(request, account);
  const categories = await (await request.get('/api/forum/categories')).json();
  const title = `Draft ${account.username}`;
  const created = await request.post('/api/forum/posts', {
    headers,
    data: { title, content: 'Not published yet.', categoryId: categories[0].id, draft: true },
  });
  expect(created.status()).toBe(201);
  const { slug } = await created.json();

  // A guest is told it does not exist, and nothing of the draft leaks.
  await page.goto(`/forum/${slug}`);
  await expect(page.getByRole('heading', { name: 'Post not found' })).toBeVisible();
  await expect(page.getByText(title)).toHaveCount(0);
  await expect(page.getByText('Not published yet.')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Back to the forum' })).toHaveAttribute(
    'href',
    '/forum'
  );

  // A post that never existed says the same.
  await page.goto('/forum/no-such-post-at-all-164');
  await expect(page.getByRole('heading', { name: 'Post not found' })).toBeVisible();

  // The author, signed in, reads their own draft, named as one.
  await signIn(page, account);
  await page.goto(`/forum/${slug}`);
  const article = page.getByRole('article', { name: title });
  await expect(article).toBeVisible();
  await expect(article.getByText('draft', { exact: true })).toBeVisible();
});
