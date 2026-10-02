'use client'

import { createContext, useContext, useState } from 'react'
import { MODES, type Mode } from '@/lib/constants'

type ModeValue = { mode: Mode; setMode: (mode: Mode) => void }

// Without a provider (a unit test of one component) the mode is Beginner and switching does nothing.
const ModeContext = createContext<ModeValue>({ mode: MODES.beginner, setMode: () => {} })

/**
 * Beginner or Developer mode (DESIGN 5.1). Never saved: every page load starts
 * in Beginner mode, because keys vanish on reload and Developer mode would
 * have nothing to run with.
 */
export function ModeProvider({ children }: { children: React.ReactNode }) {
	const [mode, setMode] = useState<Mode>(MODES.beginner)
	return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>
}

export function useMode(): ModeValue {
	return useContext(ModeContext)
}
