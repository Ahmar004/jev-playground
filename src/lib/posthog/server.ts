import 'server-only'
import { PostHog } from 'posthog-node'

// One client per server process, flushed eagerly since serverless functions
// can freeze/exit before a batched flush would fire otherwise.
let client: PostHog | undefined

export function getPostHogServerClient() {
	if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return undefined

	client ??= new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
		host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
		flushAt: 1,
		flushInterval: 0
	})

	return client
}
