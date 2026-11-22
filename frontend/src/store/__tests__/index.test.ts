import { useStore } from '../index';

beforeEach(() => {
  // Reset store state between tests
  useStore.setState({
    isAuthenticated: false,
    isInitialized: false,
    isLoading: false,
  });
});

describe('Combined store >-65', () => {
  it('exposes setLoading from UISlice', () => {
    useStore.getState().setLoading(true);
    expect(useStore.getState().isLoading).toBe(true);
  });

  it('exposes setAuthenticated from AuthSlice', () => {
    useStore.getState().setAuthenticated();
    const state = useStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state).not.toHaveProperty('user');
  });

  it('exposes logout from AuthSlice', () => {
    useStore.getState().setAuthenticated();
    useStore.getState().logout();
    expect(useStore.getState().isAuthenticated).toBe(false);
  });

  it('UISlice and AuthSlice state are independent', () => {
    useStore.getState().setLoading(true);
    useStore.getState().setAuthenticated();
    expect(useStore.getState().isLoading).toBe(true);
    expect(useStore.getState().isAuthenticated).toBe(true);
  });
});
