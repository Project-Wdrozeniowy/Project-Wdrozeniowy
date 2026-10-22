import { render, screen, within } from '@testing-library/react';
import InterestsPicker from '../InterestsPicker';
import {
  INTERESTS_LIST_LABEL,
  INTERESTS_TITLE,
  INTERESTS_UNAVAILABLE_BADGE,
  INTERESTS_UNAVAILABLE_TEXT,
} from '../interests.const';
import { CATEGORIES } from '@/shared/constants/categories.const';

// PROVISIONAL (PWDRZ-154): the backend registration contract has no interests field, so the picker
// is a disabled preview. These tests pin that temporary state; they say nothing about persistence,
// which does not exist. Replace them when the contract does.
describe('InterestsPicker (provisional, PWDRZ-154)', () => {
  it('says plainly that choosing topics is not available and nothing would be saved', () => {
    render(<InterestsPicker />);

    const section = screen.getByRole('region', { name: INTERESTS_TITLE });
    expect(within(section).getByText(INTERESTS_UNAVAILABLE_BADGE)).toBeInTheDocument();
    expect(within(section).getByText(INTERESTS_UNAVAILABLE_TEXT)).toBeInTheDocument();
    expect(section).toHaveAccessibleDescription(INTERESTS_UNAVAILABLE_TEXT);
  });

  it('does not promise personalization', () => {
    render(<InterestsPicker />);
    expect(screen.queryByText(/to personalize your feed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Selected \d+ topic/)).not.toBeInTheDocument();
  });

  it('offers no control: nothing can be selected, so nothing can be silently discarded', () => {
    render(<InterestsPicker />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(document.querySelector('input')).toBeNull();
  });

  it('still lists the topics, as a labelled read-only preview', () => {
    render(<InterestsPicker />);

    const list = screen.getByRole('list', { name: INTERESTS_LIST_LABEL });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(CATEGORIES.map(({ label }) => `${label[0]}${label}`));
  });
});
