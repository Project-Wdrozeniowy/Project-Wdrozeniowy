import { test, expect, gatewayURL } from '../support/fixtures.js';

// PWDRZ-146 owns the transition to implemented recommendations. Reconcile this
// regression with its published contract when those hidden 501 stubs are replaced.
test('integration: recommendations remain unavailable while PWDRZ-146 is pending', async ({
  request,
}) => {
  for (const kind of ['posts', 'tags']) {
    const response = await request.get(`${gatewayURL}/api/recommendations/${kind}`, {
      params: { limit: 10 },
    });
    expect(response.status()).toBe(501);
    expect((await response.json()).status).toBe(501);
  }
  // Real gateway/backend failure-mode evidence; planned adapter mocks are not
  // presented as proof of successful recommendations or an implemented UI.
});
