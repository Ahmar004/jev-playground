import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'
import { buildRobots, normalizeBaseUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
	return buildRobots(normalizeBaseUrl(env.NEXT_PUBLIC_APP_URL))
}
