'use client'

import { useState } from 'react'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { handleStaleDeploy } from '@/lib/errors/stale-deploy'

// QueryClient MUST be created inside a useState initializer, never at
// module scope — a module-level client is shared across every request on
// the server, leaking one user's cached data into another's response. This
// is the org's own documented convention (see 8x-core's
// REVAMP_GUIDELINES.md); this template installs the dependency for real
// instead of leaving it as an aspirational rule with nothing behind it.
//
// Every Server Action runs in a mutation, so this one handler shows the
// site-updated notice for any action a redeploy left behind, including the
// quiet ones; each mutation's own error toast skips that case.
export function QueryProvider({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				mutationCache: new MutationCache({ onError: (error) => void handleStaleDeploy(error) })
			})
	)

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
