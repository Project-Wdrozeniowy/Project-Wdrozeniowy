import { afterEach, vi } from 'vitest';
import { newOpeningId } from '@/shared/api/forum/openingId';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe('the id of one opening', () => {
  it('is a UUID the contract accepts, and a new one every time', () => {
    const ids = Array.from({ length: 50 }, () => newOpeningId());

    ids.forEach((id) => expect(id).toMatch(UUID_V4));
    expect(new Set(ids).size).toBe(50);
  });

  it('is built from random bytes where the page has no secure context for randomUUID', () => {
    const { getRandomValues } = crypto;
    vi.stubGlobal('crypto', { getRandomValues: getRandomValues.bind(crypto) });

    const ids = Array.from({ length: 50 }, () => newOpeningId());

    ids.forEach((id) => expect(id).toMatch(UUID_V4));
    expect(new Set(ids).size).toBe(50);
  });

  it('sets the version and the variant whatever the random bytes are', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(0xff) });
    expect(newOpeningId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');

    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(0) });
    expect(newOpeningId()).toBe('00000000-0000-4000-8000-000000000000');
  });
});
