import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import CategoryDistributionCard from '@/pages/dashboard/ui/CategoryDistributionCard';
import { apiClient } from '@/shared/api/client/api';
import type { PublicCategoryDistributionDto } from '@/shared/api/generated/models/publicCategoryDistributionDto.dto';
import { makeCategories, requestsTo } from '@/test/fakeAnalyticsServer';

const url = '/analytics/public/categories';
let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);
});
afterEach(() => mock.restore());

function mount(period: '7d' | '30d' = '7d') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = (value: '7d' | '30d') => (
    <QueryClientProvider client={client}>
      <CategoryDistributionCard period={value} />
    </QueryClientProvider>
  );
  return { client, ...render(view(period)), switchPeriod: (value: '7d' | '30d') => view(value) };
}

async function openTable() {
  const button = screen.getByRole('button', { name: 'Category data table' });
  await userEvent.click(button);
  expect(button).toHaveAttribute('aria-expanded', 'true');
  return screen.getByRole('table');
}

it('shows every API category, full labels, counts and shares with a semantic table', async () => {
  const longName = 'A category with a very long name'.repeat(3);
  const data = makeCategories([
    [longName, 2, 'ai'],
    ['Quiet', 0],
    ['Custom', 1],
    [null, 0],
  ]);
  data.categories[2].category!.visible = false;
  mock.onGet(url).reply(200, data);
  mount();
  const graph = await screen.findByRole('group', { name: /Posts by category, Last 7 days/ });
  expect(graph).toHaveAccessibleName(new RegExp(`${longName}: 2`));
  const bars = within(graph).getAllByTestId('category-bar');
  expect(bars.map((bar) => bar.style.width)).toEqual(['100%', '0%', '50%', '0%']);
  expect(screen.getByText('3 public posts')).toBeInTheDocument();
  const table = await openTable();
  expect(
    within(table)
      .getAllByRole('columnheader')
      .map((node) => node.textContent)
  ).toEqual(['Category', 'Posts', 'Share']);
  expect(within(table).getByRole('rowheader', { name: longName })).toBeInTheDocument();
  expect(within(table).getByRole('rowheader', { name: 'Custom' })).toBeInTheDocument();
  expect(within(table).getByRole('rowheader', { name: 'No category' })).toBeInTheDocument();
  expect(within(table).getByRole('cell', { name: '66.67%' })).toBeInTheDocument();
  expect(within(table).getByRole('cell', { name: '33.33%' })).toBeInTheDocument();
  expect(within(table).getAllByRole('cell', { name: '0%' })).toHaveLength(2);
  expect(requestsTo(mock, url)).toHaveLength(1);
  const actions = screen.getAllByRole('link');
  expect(actions).toHaveLength(data.categories.length * 2);
  const zero = screen.getAllByRole('link', { name: /Open 0 posts in Quiet/ });
  expect(zero[0].getAttribute('href')).toBe(zero[1].getAttribute('href'));
  expect(actions.every((link) => !link.closest('[role="img"], [aria-hidden="true"]'))).toBe(true);
});

it('keeps more than eight categories, duplicate names and uncategorized separately', async () => {
  mock.onGet(url).reply(200, makeCategories(Array.from({ length: 10 }, () => ['Same', 1])));
  mount();
  await screen.findByRole('group');
  const table = await openTable();
  expect(within(table).getAllByRole('rowheader', { name: 'Same' })).toHaveLength(10);
  expect(within(table).getAllByRole('rowheader')).toHaveLength(11);
  expect(screen.queryByText('Other')).not.toBeInTheDocument();
});

it('distinguishes a zero window from missing data and leaves its zero rows inspectable', async () => {
  mock.onGet(url).reply(200, makeCategories([['Quiet', 0]]));
  mount();
  expect(await screen.findByText('No public posts in this window yet.')).toBeInTheDocument();
  expect(screen.getByText('0 public posts')).toBeInTheDocument();
  const table = await openTable();
  expect(within(table).getAllByRole('cell', { name: 'Not applicable' })).toHaveLength(2);
  expect(within(table).getAllByRole('cell', { name: '0' })).toHaveLength(2);
  expect(document.body.innerHTML).not.toMatch(/NaN|Infinity/);
});

it('shows the actual UTC window and the read time, with the exclusive end explained', async () => {
  mock.onGet(url).reply(200, makeCategories([[null, 1]]));
  mount();
  expect(await screen.findByText('1 public post')).toBeInTheDocument();
  expect(screen.getByText(/Nov 12, 2026.*Nov 19, 2026.*end exclusive.*UTC/)).toBeInTheDocument();
  expect(screen.getByText('Nov 18, 2026, 10:00 UTC')).toHaveAttribute(
    'datetime',
    '2026-11-18T10:00:00Z'
  );
});

it('shows a loading state before receiving any values', () => {
  mock.onGet(url).reply(() => new Promise(() => {}));
  mount();
  expect(screen.getByRole('status', { name: 'Loading chart' })).toBeInTheDocument();
  expect(screen.queryByText('0 public posts')).not.toBeInTheDocument();
});

it('keeps a focused retry mounted, suppresses duplicate retries and recovers from the first failure', async () => {
  mock.onGet(url).replyOnce(500, { detail: 'private database detail' });
  let finish!: (response: [number, PublicCategoryDistributionDto]) => void;
  mock.onGet(url).reply(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  mount();
  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('We could not load this. Please try again.');
  expect(document.body).not.toHaveTextContent('private database detail');
  const retry = within(alert).getByRole('button', { name: 'Try again' });
  retry.focus();
  await userEvent.keyboard('{Enter}');
  await waitFor(() => expect(retry).toHaveAttribute('aria-disabled', 'true'));
  expect(retry).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  expect(requestsTo(mock, url)).toHaveLength(2);
  await act(async () => finish([200, makeCategories([['Recovered', 4]])]));
  expect(await screen.findByText('4 public posts')).toBeInTheDocument();
});

it('keeps old data and its timestamp when a background refresh fails, then retries in place', async () => {
  mock.onGet(url).reply(200, makeCategories([['Saved', 2]]));
  const { client } = mount();
  await screen.findByText('2 public posts');
  const table = await openTable();
  mock.onGet(url).reply(500);
  await act(async () => {
    await client.invalidateQueries({ queryKey: [url] });
  });
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not update categories. Showing the last loaded data.'
  );
  expect(table).toBeVisible();
  expect(screen.getByText('2 public posts')).toBeInTheDocument();
  let finish!: (response: [number, PublicCategoryDistributionDto]) => void;
  mock.onGet(url).reply(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(screen.getByText('2 public posts')).toBeInTheDocument();
  await act(async () => finish([200, makeCategories([['Saved', 3]])]));
  expect(await screen.findByText('3 public posts')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('announces a background refresh without replacing loaded data', async () => {
  mock.onGet(url).reply(200, makeCategories([['Saved', 2]]));
  const { client } = mount();
  await screen.findByText('2 public posts');
  let finish!: (response: [number, PublicCategoryDistributionDto]) => void;
  mock.onGet(url).reply(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  let refresh!: Promise<void>;
  act(() => {
    refresh = client.invalidateQueries({ queryKey: [url] });
  });
  expect(await screen.findByText('Updating categories…')).toBeInTheDocument();
  expect(screen.getByText('2 public posts')).toBeInTheDocument();
  await act(async () => {
    finish([200, makeCategories([['Saved', 3]])]);
    await refresh;
  });
  expect(await screen.findByText('3 public posts')).toBeInTheDocument();
});

it('does not label a cached period as a new one or let a late previous-period result replace it', async () => {
  let finish!: (response: [number, PublicCategoryDistributionDto]) => void;
  mock.onGet(url).reply((config) =>
    config.params.period === '7d'
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : [200, makeCategories([['Month', 30]], '30d')]
  );
  const { rerender, switchPeriod } = mount();
  await waitFor(() => expect(requestsTo(mock, url)).toHaveLength(1));
  rerender(switchPeriod('30d'));
  expect(await screen.findByText('30 public posts')).toBeInTheDocument();
  await act(async () => finish([200, makeCategories([['Week', 7]])]));
  expect(screen.queryByText('Week')).not.toBeInTheDocument();
  expect(screen.getByText('30 public posts')).toBeInTheDocument();
  expect(screen.getByText('Last 30 days')).toBeInTheDocument();
});

it('keeps the table toggle in the keyboard path', async () => {
  mock.onGet(url).reply(200, makeCategories([['Only', 1]]));
  mount();
  await screen.findByRole('group');
  await userEvent.tab();
  expect(screen.getByRole('link', { name: /Open 1 post in Only/ })).toHaveFocus();
  await userEvent.tab();
  expect(screen.getByRole('link', { name: /Open 0 posts in No category/ })).toHaveFocus();
  await userEvent.tab();
  expect(screen.getByRole('button', { name: 'Category data table' })).toHaveFocus();
  await userEvent.keyboard(' ');
  expect(screen.getByRole('table')).toBeVisible();
  await userEvent.keyboard('{Enter}');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});
