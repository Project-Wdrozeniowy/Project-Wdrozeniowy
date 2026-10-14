// The access token lives only in this module-level variable: never in localStorage,
// sessionStorage or the DOM, so injected scripts cannot read it from storage.
// It is lost on reload and restored from the httpOnly refresh cookie (see AuthProvider).
let accessToken: string | null = null;

export const tokenMemory = {
  get: (): string | null => accessToken,
  set: (token: string | null): void => {
    accessToken = token;
  },
};
