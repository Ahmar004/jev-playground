import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { captureError } from '@/lib/observability/capture-error'

// Route files under src/app/api/**/route.ts should contain zero logic —
// just `export const GET = createApiRoute(...)`. Schema + handler logic
// lives in src/server/api/**, built through this factory. This keeps every
// route's input/output contract explicit and runtime-checked, and keeps
// route.ts diffable/skimmable without reading the actual logic.
// `input` is required, not optional — routes with no meaningful input still
// pass `z.void()` or `z.object({})`. This matches the org's proven
// convention (see REVAMP_GUIDELINES.md in 8x-core): every route has an
// explicit, runtime-checked input contract, not an implicit "no schema
// means no validation" escape hatch.
export function createApiRoute<InputSchema extends z.ZodType, Output>(config: {
	input: InputSchema
	handler: (input: z.infer<InputSchema>, req: NextRequest) => Promise<Output>
}) {
	return async function (req: NextRequest) {
		try {
			const rawInput =
				req.method === 'GET'
					? Object.fromEntries(req.nextUrl.searchParams)
					: await req.json().catch(() => ({}))

			const input = config.input.parse(rawInput)
			const output = await config.handler(input, req)
			return NextResponse.json(output)
		} catch (error) {
			if (error instanceof z.ZodError) {
				return NextResponse.json(
					{ error: 'Invalid request', issues: error.flatten() },
					{ status: 400 }
				)
			}
			// Throw AppError (src/lib/errors/app-error.ts) for anything the user
			// did to cause this — captureError reads its status/userMessage
			// straight through and skips Sentry, since that's normal control
			// flow. Anything else is treated as a bug: generic message to the
			// caller, real detail to Sentry (see docs/rules/error-handling.md).
			const { userMessage, status } = captureError(error)
			return NextResponse.json({ error: userMessage }, { status })
		}
	}
}
