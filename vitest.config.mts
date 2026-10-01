import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// App tests (CLAUDE.md > Workflow): the runner, parsing, scoring, cost, keys,
// actions, hooks and components. Files are *.test.ts(x). The template's
// node:test suites (*.test.mjs, *.test.mts) run separately in `pnpm test`.
// scripts/**/*.test.ts covers the recording CLI's modules (node environment).
export default defineConfig({
	plugins: [react()],
	// Resolves the `@/` alias from tsconfig.json, like the app does.
	resolve: {
		tsconfigPaths: true,
		alias: { 'server-only': fileURLToPath(new URL('./vitest.server-only.ts', import.meta.url)) }
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
		setupFiles: ['./vitest.setup.ts'],
		restoreMocks: true
	}
})
