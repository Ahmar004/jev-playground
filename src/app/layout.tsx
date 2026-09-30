import type { Metadata } from 'next'
import { QueryProvider } from '@/components/query-provider'
import { AnalyticsProvider } from '@/lib/analytics/analytics-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
	title: '8x web template'
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
