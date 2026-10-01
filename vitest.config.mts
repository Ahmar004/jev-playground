import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// App tests (CLAUDE.md > Workflow): the runner, parsing, scoring, cost, keys,
// actions, hooks and components. Files are *.test.ts(x). The template's
// node:test suites (*.test.mjs, *.test.mts) run separately in `pnpm test`.
export default defineConfig({
	plugins: [react()],
	// Resolves the `@/` alias from tsconfig.json, like the app does.
	resolve: { tsconfigPaths: true },
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.{ts,tsx}'],
		setupFiles: ['./vitest.setup.ts'],
		restoreMocks: true
	}
})
