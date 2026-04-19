# AGENTS.md

Project intro and local setup: [README.md](README.md), [CONTRIBUTING.md](CONTRIBUTING.md).

## Non-obvious rules

- User-facing copy is in Czech. Code, comments, and commit messages are in English.

- Comments explain why, not what. Skip them when the code already speaks for itself; add one only for hidden constraints, workarounds, or non-obvious invariants.

- Don't defend impossible edge cases. Graceful-enough beats bulletproof.

- Don't abstract for hypothetical futures. Inline helpers used once; keep helpers used 2+ times with a clarifying name.

- Split I/O from pure logic. Test the pure half with literal inputs; the I/O wrapper stays untested.

- Don't reach for `useCallback` / `useMemo` by default. Use them only when a memoized child consumes the value, a re-render cost is actually measurable, or Biome's `useExhaustiveDependencies` rule would otherwise force an unstable dependency.

- Don't link to [/debug](src/app/debug/) from the public UI.

- Test layering: pure logic → `node --test` in [`src/__tests__/`](src/__tests__/). UI behavior → Playwright in [`e2e/`](e2e/). Relative imports in test files need the `.ts` extension (Node's TS stripper requires it).

## Before finishing a change

`pnpm check-types && pnpm lint && pnpm test && pnpm test:e2e`
