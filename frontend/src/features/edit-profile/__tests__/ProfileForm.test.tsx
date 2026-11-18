import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ProfileForm from '../ProfileForm';
import { PROFILE_FIELDS, PROFILE_FIELD_ERRORS, PROFILE_FIELD_IDS } from '../profile.const';
import type { ProfileField } from '../profile.const';
import type { MyProfileDto as MyProfile } from '@/shared/api/generated/models/myProfileDto.dto';

vi.mock('react-router', async () => (await import('@/test/routerMock')).routerMock());

const PROFILE: MyProfile = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: null,
  bio: 'Hello',
  role: 'USER',
  status: 'ACTIVE',
  postCount: 0,
  commentCount: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
};

function setup(fields: readonly ProfileField[] = PROFILE_FIELDS) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ProfileForm profile={PROFILE} fields={fields} title="Account settings" />
    </QueryClientProvider>
  );
  return userEvent.setup();
}

const field = (name: string) => screen.getByLabelText(name);

describe('ProfileForm field presentation', () => {
  it('shows only the fields it is given, each still labelled and wired', () => {
    setup(['email']);
    expect(field('Email')).toHaveAttribute('id', PROFILE_FIELD_IDS.email);
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Bio')).not.toBeInTheDocument();
  });

  it('focuses each control from its label', async () => {
    const user = setup();
    for (const name of ['Email', 'Display name', 'Avatar link', 'Bio']) {
      await user.click(screen.getByText(name));
      expect(field(name)).toHaveFocus();
    }
  });

  it('uses the documented ids for the controls', () => {
    setup();
    expect(field('Email')).toHaveAttribute('id', PROFILE_FIELD_IDS.email);
    expect(field('Display name')).toHaveAttribute('id', PROFILE_FIELD_IDS.displayName);
    expect(field('Avatar link')).toHaveAttribute('id', PROFILE_FIELD_IDS.avatarUrl);
    expect(field('Bio')).toHaveAttribute('id', PROFILE_FIELD_IDS.bio);
  });

  it('describes the fields that have a hint by that hint, and Email by nothing', () => {
    setup();
    expect(field('Email')).not.toHaveAttribute('aria-describedby');
    expect(field('Display name')).toHaveAccessibleDescription(
      'Shown instead of your username. Leave it empty to use your username.'
    );
    expect(field('Avatar link')).toHaveAccessibleDescription(
      'A link to an image, starting with http:// or https://.'
    );
    expect(field('Bio')).toHaveAccessibleDescription('5/1000');
  });

  it('describes an invalid field by its hint and its single error', async () => {
    const user = setup();
    await user.clear(field('Avatar link'));
    await user.type(field('Avatar link'), 'not a link');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(PROFILE_FIELD_ERRORS.avatarUrlInvalid);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(field('Avatar link')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Avatar link')).toHaveAttribute(
      'aria-describedby',
      `${PROFILE_FIELD_IDS.avatarUrl}-hint ${alert.id}`
    );
  });

  it('describes an invalid field without a hint by its error only', async () => {
    const user = setup();
    await user.clear(field('Email'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(PROFILE_FIELD_ERRORS.emailRequired);
    expect(field('Email')).toHaveAttribute('aria-describedby', alert.id);
  });
});
