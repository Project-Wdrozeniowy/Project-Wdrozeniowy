import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const sourceRoot = path.resolve(__dirname, '../../..');
const rank: Record<string, number> = { app: 0, pages: 1, widgets: 2, features: 3, shared: 4 };

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return ['__tests__', 'test', 'generated'].includes(entry.name) ? [] : sourceFiles(file);
    }
    return /\.(ts|tsx)$/.test(file) && !file.endsWith('.d.ts') ? [file] : [];
  });
}

function resolveLocal(specifier: string, importer: string) {
  const base = specifier.startsWith('@/')
    ? path.join(sourceRoot, specifier.slice(2))
    : specifier.startsWith('.')
      ? path.resolve(path.dirname(importer), specifier)
      : undefined;
  if (!base) return undefined;
  return [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')].find(
    (file) => existsSync(file) && statSync(file).isFile()
  );
}

function location(file: string) {
  const name = path.relative(sourceRoot, file).split(path.sep).join('/');
  const [layer, slice] = name.split('/');
  return { file, name, layer, slice, rank: rank[layer] };
}

const dependencies = sourceFiles(sourceRoot).flatMap((file) => {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const imports: string[] = [];
  function visit(node: ts.Node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text);
    }
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      imports.push(node.argument.literal.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return imports.flatMap((specifier) => {
    const target = resolveLocal(specifier, file);
    return target
      ? [
          {
            from: location(file),
            to: location(target),
            description: `${location(file).name} → ${specifier}`,
          },
        ]
      : [];
  });
});

describe('SPA routing and FSD dependency boundaries', () => {
  it('keeps production dependencies directed from higher layers to lower layers', () => {
    expect(
      dependencies
        .filter(
          ({ from, to }) => from.rank !== undefined && to.rank !== undefined && to.rank < from.rank
        )
        .map(({ description }) => description)
    ).toEqual([]);
  });

  it('keeps page, widget and feature slices independent of peers on their layer', () => {
    expect(
      dependencies
        .filter(
          ({ from, to }) =>
            ['pages', 'widgets', 'features'].includes(from.layer) &&
            from.layer === to.layer &&
            from.slice !== to.slice
        )
        .map(({ description }) => description)
    ).toEqual([]);
  });

  it('integrates new page and post-feed boundaries through their curated public entries', () => {
    expect(dependencies.some(({ from, to }) => from.layer === 'app' && to.layer === 'pages')).toBe(
      true
    );
    expect(
      dependencies
        .filter(({ from, to }) => {
          const publicSlice =
            to.layer === 'pages' || (to.layer === 'widgets' && to.slice === 'post-feed');
          const sameSlice = from.layer === to.layer && from.slice === to.slice;
          return publicSlice && !sameSlice && to.name !== `${to.layer}/${to.slice}/index.ts`;
        })
        .map(({ description }) => description)
    ).toEqual([]);
  });

  it('keeps slice internals from importing their own public entry and creating barrel cycles', () => {
    expect(
      dependencies
        .filter(
          ({ from, to }) =>
            ['pages', 'widgets', 'features'].includes(from.layer) &&
            from.layer === to.layer &&
            from.slice === to.slice &&
            from.file !== to.file &&
            to.name === `${to.layer}/${to.slice}/index.ts`
        )
        .map(({ description }) => description)
    ).toEqual([]);
  });
});
