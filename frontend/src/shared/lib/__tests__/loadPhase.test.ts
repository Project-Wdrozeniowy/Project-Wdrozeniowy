import { getLoadPhase } from '../loadPhase';

const base = { isPending: false, isLoadingError: false, isFetching: false, errorUpdateCount: 0 };

describe('getLoadPhase', () => {
  it('is loading for a first load', () => {
    expect(getLoadPhase({ ...base, isPending: true, isFetching: true })).toBe('loading');
  });

  it('is loading while a query waits and has never failed', () => {
    expect(getLoadPhase({ ...base, isPending: true })).toBe('loading');
  });

  it('is failed after a first load fails', () => {
    expect(getLoadPhase({ ...base, isLoadingError: true, errorUpdateCount: 1 })).toBe('failed');
  });

  it('is retrying when the query is pending again after a failure', () => {
    expect(getLoadPhase({ ...base, isPending: true, isFetching: true, errorUpdateCount: 1 })).toBe(
      'retrying'
    );
  });

  it('is retrying when a failed query is fetching', () => {
    expect(
      getLoadPhase({ ...base, isLoadingError: true, isFetching: true, errorUpdateCount: 1 })
    ).toBe('retrying');
  });

  it('is loaded once there is data, even while it refreshes', () => {
    expect(getLoadPhase({ ...base, isFetching: true, errorUpdateCount: 2 })).toBe('loaded');
  });

  it('is retrying when a page that failed is fetched again behind placeholder data', () => {
    expect(
      getLoadPhase({ ...base, isFetching: true, errorUpdateCount: 1, isPlaceholderData: true })
    ).toBe('retrying');
  });

  it('is loaded for placeholder data of a page that has not failed', () => {
    expect(getLoadPhase({ ...base, isFetching: true, isPlaceholderData: true })).toBe('loaded');
  });
});
