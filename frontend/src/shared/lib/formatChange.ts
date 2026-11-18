export type ChangeTone = 'up' | 'down' | 'flat' | 'none';

/** "+12.5%", "-3.1%", "0%"; `none` when there is nothing earlier to compare with. */
export function formatChange(percent: number | null | undefined): {
  text: string;
  tone: ChangeTone;
} {
  if (percent === null || percent === undefined || Number.isNaN(percent)) {
    return { text: '', tone: 'none' };
  }
  const rounded = Math.round(percent * 10) / 10;
  if (rounded === 0) return { text: '0%', tone: 'flat' };
  return rounded > 0 ? { text: `+${rounded}%`, tone: 'up' } : { text: `${rounded}%`, tone: 'down' };
}
