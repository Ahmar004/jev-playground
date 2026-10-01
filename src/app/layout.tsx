import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import { QueryProvider } from '@/components/query-provider'
import { AppProviders } from '@/components/providers/app-providers'
import { AnalyticsProvider } from '@/lib/analytics/analytics-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

// Self-hosted at build by next/font, so no request goes to Google at runtime.
const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' })

export const metadata: Metadata = {
	title: "Jev's Playground",
	description:
		'Learn where System One models like Jev work well, where they break, and when an LLM or plain code is the better tool.'
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
