import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// WCAG 2.1 contrast, so a token change that breaks AA (R88) fails here.
function luminance(hex: string): number {
	const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
	const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
	return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
	return (hi! + 0.05) / (lo! + 0.05)
}

function tokensIn(block: string): Record<string, string> {
	return Object.fromEntries(
		[...block.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)].map(([, name, hex]) => [name, hex])
	)
}

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')
const themes = {
	light: tokensIn(css.match(/:root\s*\{([^}]*)\}/)![1]!),
	dark: tokensIn(css.match(/\.dark\s*\{([^}]*)\}/)![1]!)
}

const TEXT_TOKENS = [
	'text',
	'text-muted',
	'text-faint',
	'accent',
	'success',
	'warning',
	'danger',
	'jev',
	'llm',
	'code'
]
const AA_TEXT = 4.5
const AA_NON_TEXT = 3

describe.each(Object.entries(themes))('%s theme tokens', (_name, t) => {
	it.each(TEXT_TOKENS)('%s reads at AA on bg and surface', (token) => {
		expect(contrast(t[token]!, t.bg!)).toBeGreaterThanOrEqual(AA_TEXT)
		expect(contrast(t[token]!, t.surface!)).toBeGreaterThanOrEqual(AA_TEXT)
	})

	it('border-strong meets the non-text minimum', () => {
		expect(contrast(t['border-strong']!, t.bg!)).toBeGreaterThanOrEqual(AA_NON_TEXT)
		expect(contrast(t['border-strong']!, t.surface!)).toBeGreaterThanOrEqual(AA_NON_TEXT)
	})

	it('ink colors read on their fills', () => {
		expect(contrast(t['accent-ink']!, t.accent!)).toBeGreaterThanOrEqual(AA_TEXT)
		expect(contrast(t['accent-ink']!, t['accent-hover']!)).toBeGreaterThanOrEqual(AA_TEXT)
		expect(contrast(t['highlight-ink']!, t.highlight!)).toBeGreaterThanOrEqual(AA_TEXT)
	})
})
