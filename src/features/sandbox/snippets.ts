import { TYPESAFE_URL } from '@/runner/providers/typesafe'
import { docToBody, type SandboxDoc } from './doc'

// A placeholder, never a real key: the snippet is meant to be pasted elsewhere.
const KEY_PLACEHOLDER = 'YOUR_TYPESAFE_KEY'

/** A ready-to-run curl command for the setup (R54). */
export function curlSnippet(doc: SandboxDoc): string {
	const body = JSON.stringify(docToBody(doc), null, 2).replaceAll("'", "'\\''")
	return [
		`curl ${TYPESAFE_URL} \\`,
		`  -H "Authorization: Bearer ${KEY_PLACEHOLDER}" \\`,
		`  -H "Content-Type: application/json" \\`,
		`  -d '${body}'`
	].join('\n')
}

/** A ready-to-run TypeScript fetch call for the setup (R54). */
export function fetchSnippet(doc: SandboxDoc): string {
	const body = JSON.stringify(docToBody(doc), null, 2).replaceAll('\n', '\n\t')
	return [
		`const response = await fetch('${TYPESAFE_URL}', {`,
		`\tmethod: 'POST',`,
		`\theaders: {`,
		`\t\tAuthorization: 'Bearer ${KEY_PLACEHOLDER}',`,
		`\t\t'Content-Type': 'application/json'`,
		`\t},`,
		`\tbody: JSON.stringify(${body})`,
		`})`,
		`const { answers, usage } = await response.json()`,
		`console.log(answers, usage)`
	].join('\n')
}
