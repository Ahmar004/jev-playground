import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
	reactStrictMode: true,
	// Next.js 16 Cache Components: nothing is cached unless code opts in with
	// 'use cache', and a page can mix a prerendered shell with per-request
	// parts streamed inside <Suspense> (TECH-STACK.md > Rendering strategy).
	cacheComponents: true,
	// The Supabase CA is read from disk at runtime (src/server/db/tls.ts), so
	// file tracing must ship it with every server function on Vercel.
	outputFileTracingIncludes: { '/**': ['./prisma/prod-ca-2021.crt'] },
	// Top-level as of Next.js 16, not under `experimental`. Strictest
	// setting: any Compiler bailout fails the build instead of silently
	// skipping optimization for that component. Matches 8x-core and
	// 8x-brands — catch Compiler-incompatible code at build time, not as a
	// silent perf regression in prod.
	reactCompiler: {
		panicThreshold: 'all_errors'
	}
}

export default withSentryConfig(nextConfig, {
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	silent: !process.env.CI,
	widenClientFileUpload: true
	// disableLogger is deprecated and unsupported under Turbopack (our
	// default bundler) — Sentry's tree-shaking of its own debug logging
	// happens automatically now, nothing to configure here.
})
