import { useStore } from '../index';
import type { User } from '@/types';

const mockUser: User = {
  id: '42',
  username: 'combineduser',
  email: 'combined@example.com',
  displayName: 'Combined User',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  localStorage.clear();
  useStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
});

describe('Combined store', () => {
  it('exposes setLoading from UISlice', () => {
    useStore.getState().setLoading(true);
    expect(useStore.getState().isLoading).toBe(true);
  });

  it('exposes setUser from AuthSlice', () => {
    useStore.getState().setUser(mockUser, 'token-xyz');
    const state = useStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe('token-xyz');
    expect(state.isAuthenticated).toBe(true);
  });

  it('exposes logout from AuthSlice', () => {
    useStore.getState().setUser(mockUser, 'token-xyz');
    useStore.getState().logout();
    expect(useStore.getState().user).toBeNull();
    expect(useStore.getState().isAuthenticated).toBe(false);
  });

  it('UISlice and AuthSlice state are independent', () => {
    useStore.getState().setLoading(true);
    useStore.getState().setUser(mockUser, 'token-xyz');
    expect(useStore.getState().isLoading).toBe(true);
    expect(useStore.getState().isAuthenticated).toBe(true);
  });
});
