import { TYPESAFE_URL } from '@/runner/providers/typesafe'
import { getSession } from '@/server/auth/session'
import { log } from '@/server/lib/logger'

// The pass-through for TypeSafe-key Jev calls: TypeSafe blocks browser calls
// (spec 2.3), so the browser sends them here (DESIGN 5.3, R18). It forwards to
// two fixed URLs, stores nothing, and logs only the status and the duration:
// never the key, never the body. It runs on the default Node runtime (the `runtime`
// option is not allowed with cacheComponents).

const TYPESAFE_MODELS_URL = TYPESAFE_URL.replace('/systemone', '/models')
const MAX_BODY_BYTES = 256 * 1024
const HTTP = { badRequest: 400, unauthorized: 401, tooLarge: 413, badGateway: 502 } as const
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }

function jsonError(message: string, status: number): Response {
	return new Response(JSON.stringify({ error: message }), { status, headers: JSON_HEADERS })
}

async function forward(request: Request, url: string, method: 'GET' | 'POST'): Promise<Response> {
	if (!(await getSession())) return jsonError('Please sign in to continue.', HTTP.unauthorized)
	const authorization = request.headers.get('authorization')
	if (!authorization) return jsonError('Add your TypeSafe key first.', HTTP.badRequest)

	let body: string | undefined
	if (method === 'POST') {
		body = await request.text()
		if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
			return jsonError('That request is too large.', HTTP.tooLarge)
		}
	}

	const start = performance.now()
	let upstream: Response
	try {
		upstream = await fetch(url, {
			method,
			headers: { Authorization: authorization, 'Content-Type': 'application/json' },
			body
		})
	} catch {
		log.warn('jev pass-through could not reach TypeSafe', { method })
		return jsonError('Could not reach TypeSafe.', HTTP.badGateway)
	}
	const text = await upstream.text()
	const durationMs = Math.round(performance.now() - start)
	log.info('jev pass-through', { method, status: upstream.status, durationMs })
	return new Response(text, {
		status: upstream.status,
		headers: { ...JSON_HEADERS, 'Server-Timing': `upstream;dur=${durationMs}` }
	})
}

export function POST(request: Request): Promise<Response> {
	return forward(request, TYPESAFE_URL, 'POST')
}

/** The Keys panel's Test button: a cheap real call that proves the key works. */
export function GET(request: Request): Promise<Response> {
	return forward(request, TYPESAFE_MODELS_URL, 'GET')
}
