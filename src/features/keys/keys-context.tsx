'use client'

import { createContext, useContext, useState } from 'react'
import type { Provider } from '@/lib/constants'

export type KeyEntry = { key: string; keyId: string }
export type Keys = Partial<Record<Provider, KeyEntry>>

type KeysValue = {
	keys: Keys
	setKey: (provider: Provider, key: string) => void
	removeKey: (provider: Provider) => void
	removeAll: () => void
	panelOpen: boolean
	setPanelOpen: (open: boolean) => void
}

// A plain function: the React Compiler can't lower a computed key in a destructuring pattern.
function withoutKey(keys: Keys, provider: Provider): Keys {
	const rest = { ...keys }
	delete rest[provider]
	return rest
}

const KeysContext = createContext<KeysValue | null>(null)

/**
 * Every API key lives here and nowhere else: React state in this tab's memory.
 * It is never written to local or session storage, cookies, IndexedDB, the
 * database, a log, analytics or a URL (Rule-8, spec 4). A reload empties it.
 * Anything that needs to tell keys apart uses `keyId`, never the key.
 */
export function KeysProvider({ children }: { children: React.ReactNode }) {
	const [keys, setKeys] = useState<Keys>({})
	const [panelOpen, setPanelOpen] = useState(false)

	const value: KeysValue = {
		keys,
		setKey: (provider, key) =>
			setKeys((current) => ({
				...current,
				[provider]: { key: key.trim(), keyId: crypto.randomUUID() }
			})),
		removeKey: (provider) => setKeys((current) => withoutKey(current, provider)),
		removeAll: () => setKeys({}),
		panelOpen,
		setPanelOpen
	}
	return <KeysContext.Provider value={value}>{children}</KeysContext.Provider>
}

export function useKeys(): KeysValue {
	const value = useContext(KeysContext)
	if (!value) throw new Error('useKeys needs a KeysProvider')
	return value
}
