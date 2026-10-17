import { test, expect, gatewayURL } from '../support/fixtures.js';

test('integration: anonymous protected writes return 401 and do not create a post', async ({
  request,
  identity,
}) => {
  const title = `Forbidden ${identity.username}`;
  const response = await request.post(`${gatewayURL}/api/forum/posts`, {
    data: { title, content: 'An anonymous write must never persist.', categoryId: 1 },
  });
  expect(response.status()).toBe(401);
  const listed = await request.get(`${gatewayURL}/api/forum/posts`, { params: { q: title } });
  expect(listed.status()).toBe(200);
  expect((await listed.json()).content).toEqual([]);
  // A real cross-service HTTP boundary check, not claimed as browser E2E.
});
