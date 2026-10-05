import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'
import { buildSitemap, normalizeBaseUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
	return buildSitemap(normalizeBaseUrl(env.NEXT_PUBLIC_APP_URL))
}
