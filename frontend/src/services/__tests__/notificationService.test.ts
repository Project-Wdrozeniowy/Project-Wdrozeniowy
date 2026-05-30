import { vi } from 'vitest';
import type { Notification } from '@/shared/types';

const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/services/api', () => ({
  apiClient: mockApiClient,
}));

const { notificationService } = await import('@/services/notificationService');

const mockNotification: Notification = {
  id: 1,
  senderUsername: 'jane',
  type: 'COMMENT_ON_POST',
  entityType: 'POST',
  entityId: 1,
  message: 'Someone commented on your post',
  read: false,
  createdAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('notificationService.list >-65 GET /notifications', () => {
  it('calls apiClient.get with /notifications and empty default params', async () => {
    const paged = {
      content: [mockNotification],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 20,
      first: true,
      last: true,
    };
    mockApiClient.get.mockResolvedValue(paged);

    const result = await notificationService.list();

    expect(mockApiClient.get).toHaveBeenCalledWith('/notifications', { params: {} });
    expect(result).toEqual(paged);
  });

  it('forwards unreadOnly filter', async () => {
    const paged = {
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 0,
      size: 20,
      first: true,
      last: true,
    };
    mockApiClient.get.mockResolvedValue(paged);

    await notificationService.list({ unreadOnly: true });

    expect(mockApiClient.get).toHaveBeenCalledWith('/notifications', {
      params: { unreadOnly: true },
    });
  });

  it('forwards page and size params', async () => {
    mockApiClient.get.mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 0,
      page: 2,
      size: 10,
      first: false,
      last: true,
    });

    await notificationService.list({ page: 2, size: 10 });

    expect(mockApiClient.get).toHaveBeenCalledWith('/notifications', {
      params: { page: 2, size: 10 },
    });
  });
});

describe('notificationService.markRead >-65 PATCH /notifications/:id/read', () => {
  it('calls apiClient.patch with /notifications/:id/read and null body', async () => {
    const read = { ...mockNotification, read: true };
    mockApiClient.patch.mockResolvedValue(read);

    const result = await notificationService.markRead(1);

    expect(mockApiClient.patch).toHaveBeenCalledWith('/notifications/1/read', null);
    expect(result.read).toBe(true);
  });
});

describe('notificationService.markAllRead >-65 PATCH /notifications/read-all', () => {
  it('calls apiClient.patch with /notifications/read-all and null body', async () => {
    mockApiClient.patch.mockResolvedValue(undefined);

    await notificationService.markAllRead();

    expect(mockApiClient.patch).toHaveBeenCalledWith('/notifications/read-all', null);
  });
});

describe('notificationService.delete >-65 DELETE /notifications/:id', () => {
  it('calls apiClient.delete with /notifications/:id', async () => {
    mockApiClient.delete.mockResolvedValue(undefined);

    await notificationService.delete(1);

    expect(mockApiClient.delete).toHaveBeenCalledWith('/notifications/1');
  });
});
