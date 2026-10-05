import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import { QueryProvider } from '@/components/query-provider'
import { AppProviders } from '@/components/providers/app-providers'
import { AnalyticsProvider } from '@/lib/analytics/analytics-provider'
import { env } from '@/lib/env'
import { SITE_DESCRIPTION, SITE_NAME, normalizeBaseUrl } from '@/lib/site'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

// Self-hosted at build by next/font, so no request goes to Google at runtime.
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' })

// metadataBase turns the relative Open Graph image URL into an absolute one,
// which link previews (Discord, Slack) need. The image comes from opengraph-image.tsx.
export const metadata: Metadata = {
	metadataBase: new URL(normalizeBaseUrl(env.NEXT_PUBLIC_APP_URL)),
	title: SITE_NAME,
	description: SITE_DESCRIPTION,
	openGraph: {
		siteName: SITE_NAME,
		title: SITE_NAME,
		description: SITE_DESCRIPTION,
		type: 'website'
	},
	twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESCRIPTION }
}

// suppressHydrationWarning: next-themes sets the theme class on <html>
// before React hydrates, which React would otherwise report as a mismatch.
export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={nunito.variable} suppressHydrationWarning>
			<body className="min-h-screen antialiased">
				<AnalyticsProvider />
				<AppProviders>
					<QueryProvider>{children}</QueryProvider>
				</AppProviders>
				<Toaster />
			</body>
		</html>
	)
}
