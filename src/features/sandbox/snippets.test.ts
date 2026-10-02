import { describe, expect, it } from 'vitest'
import { QUESTION_KINDS } from '@/lib/constants'
import { TYPESAFE_URL } from '@/runner/providers/typesafe'
import { docToBody, type SandboxDoc } from './doc'
import { curlSnippet, fetchSnippet } from './snippets'

const DOC: SandboxDoc = {
	state: "It's a test",
	questions: [
		{ id: 'a', name: 'ok', question: { type: QUESTION_KINDS.noul, instructions: 'Is it fine?' } }
	]
}

describe('copy as code', () => {
	it('builds a curl command with the real URL, a key placeholder and the exact body', () => {
		const curl = curlSnippet(DOC)
		expect(curl).toContain(TYPESAFE_URL)
		expect(curl).toContain('Bearer YOUR_TYPESAFE_KEY')
		// A single quote in the state is escaped for the shell.
		expect(curl).toContain("It'\\''s a test")
	})

	it('builds a fetch call that sends the same body', () => {
		const code = fetchSnippet(DOC)
		expect(code).toContain(`fetch('${TYPESAFE_URL}'`)
		expect(code).toContain('Bearer YOUR_TYPESAFE_KEY')
		expect(code).toContain(JSON.stringify(docToBody(DOC), null, 2).replaceAll('\n', '\n\t'))
	})
})
