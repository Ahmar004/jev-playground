import type { Metadata } from 'next'
import { QueryProvider } from '@/components/query-provider'
import { AnalyticsProvider } from '@/lib/analytics/analytics-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
	title: "Jev's Playground",
	description:
		'Learn where System One models like Jev work well, where they break, and when an LLM or plain code is the better tool.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<AnalyticsProvider />
				<QueryProvider>{children}</QueryProvider>
				<Toaster />
			</body>
		</html>
	)
}
