import type { MetadataRoute } from 'next'
import { ROUTES } from './links'

export const SITE_NAME = "Jev's Playground"
export const SITE_DESCRIPTION =
	'Learn where System One models like Jev work well, where they break, and when an LLM or plain code is the better tool.'

// A trailing slash on NEXT_PUBLIC_APP_URL would otherwise double up when a path is joined on.
export function normalizeBaseUrl(url: string): string {
	return url.replace(/\/+$/, '')
}

export function absoluteUrl(baseUrl: string, path: string): string {
	return path === '/' ? baseUrl : `${baseUrl}${path}`
}

// Signed-out visitors, crawlers included, reach only sign-in and shared results
// (spec 5.1). Every other page redirects to sign-in, so listing it would hand
// crawlers a redirect. Shared results are noindex (R87), so they stay out too.
const INDEXABLE_PATHS = [ROUTES.signIn]

export function buildSitemap(baseUrl: string): MetadataRoute.Sitemap {
	return INDEXABLE_PATHS.map((path) => ({ url: absoluteUrl(baseUrl, path) }))
}

// Crawling stays allowed on purpose: a Disallow on /s/ would stop crawlers from
// ever reading its noindex, and the bare URL could still be listed (R87).
export function buildRobots(baseUrl: string): MetadataRoute.Robots {
	return {
		rules: { userAgent: '*', allow: '/' },
		sitemap: absoluteUrl(baseUrl, '/sitemap.xml')
	}
}
