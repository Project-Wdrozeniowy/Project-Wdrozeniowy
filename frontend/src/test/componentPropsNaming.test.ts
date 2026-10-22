import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Component props are named `<ComponentName>Props` (docs/guides/naming-conventions.md).
 * Next.js special files (pages, layouts, ...) are the exception: the framework defines their
 * props, so their shapes stay as the framework documents them.
 */
const SRC = join(__dirname, '..');
const NEXT_SPECIAL_FILES = new Set([
  'page.tsx',
  'layout.tsx',
  'template.tsx',
  'loading.tsx',
  'error.tsx',
  'global-error.tsx',
  'not-found.tsx',
  'default.tsx',
]);

function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' || entry.name === 'test' ? [] : componentFiles(path);
    }
    const isComponentFile =
      entry.name.endsWith('.tsx') &&
      !entry.name.endsWith('.test.tsx') &&
      !NEXT_SPECIAL_FILES.has(entry.name);
    return isComponentFile ? [path] : [];
  });
}

/** The text between the parentheses that open at `start`, or `null` when they never close. */
function parenthesised(source: string, start: number): string | null {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')' && --depth === 0) return source.slice(start + 1, i);
  }
  return null;
}

interface ComponentProps {
  file: string;
  component: string;
  params: string;
}

function components(): ComponentProps[] {
  const found: ComponentProps[] = [];
  for (const path of componentFiles(SRC)) {
    const source = readFileSync(path, 'utf8');
    // `function Name(` and `const Name = (...) =>`, which are the forms components are written in.
    const declarations = source.matchAll(
      /(?:function\s+([A-Z]\w*)\s*\(|const\s+([A-Z]\w*)\s*(?::[^=\n]+)?=\s*(?:\w+\()?\s*(?:async\s+)?\()/g
    );
    for (const match of declarations) {
      const params = parenthesised(source, match.index + match[0].length - 1);
      const name = match[1] ?? match[2];
      if (params?.trim()) {
        found.push({
          file: relative(SRC, path).split(sep).join('/'),
          component: name,
          params: params.replace(/\s+/g, ' ').trim(),
        });
      }
    }
  }
  return found;
}

describe('component props naming', () => {
  const all = components();

  it('finds the project components', () => {
    const names = all.map((c) => c.component);
    expect(names).toEqual(expect.arrayContaining(['PostCard', 'FormField', 'AuthGuard']));
  });

  it('does not check the files the framework owns', () => {
    expect(all.some((c) => /(^|\/)(page|layout)\.tsx$/.test(c.file))).toBe(false);
  });

  it.each(all.map((c) => [`${c.file} › ${c.component}`, c] as const))(
    '%s types its props as <ComponentName>Props',
    (_name, { component, params }) => {
      expect(params).toMatch(new RegExp(`:\\s*${component}Props\\s*,?$`));
    }
  );
});
