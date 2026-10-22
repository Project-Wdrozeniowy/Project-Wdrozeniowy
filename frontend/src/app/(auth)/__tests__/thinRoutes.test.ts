import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROUTES = ['login', 'register'] as const;

/**
 * The auth routes only compose: a heading and the feature's form. Submission, network calls, the
 * session and the redirect belong to `features/sign-in` and `features/sign-up`.
 */
describe.each(ROUTES)('the %s route file', (route) => {
  const source = readFileSync(join(__dirname, '..', route, 'page.tsx'), 'utf8');

  it('composes its feature form', () => {
    expect(source).toMatch(/from '@\/features\/sign-(in|up)\/(Login|Register)Form'/);
  });

  it.each([
    ['network or API calls', /authClient|apiClient|axios|fetch\(/],
    ['form handling', /react-hook-form|zodResolver|handleSubmit/],
    ['session state', /@\/store|setAuth/],
    ['navigation after submit', /useRouter|router\.push/],
    ['local component state', /useState/],
  ])('has no %s', (_name, pattern) => {
    expect(source).not.toMatch(pattern);
  });
});
