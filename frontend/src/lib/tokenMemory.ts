let accessToken: string | null = null;

export const tokenMemory = {
  get: (): string | null => accessToken,
  set: (token: string | null): void => {
    accessToken = token;
  },
};
