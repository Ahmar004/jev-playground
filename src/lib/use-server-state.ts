import { useState, type Dispatch, type SetStateAction } from 'react'

/**
 * State that starts from a server prop, is updated optimistically, and adopts
 * the prop again whenever the server sends a new one (after `refresh()` or a
 * revisit). `useState(initial)` alone ignores fresh props, and Next 16 keeps a
 * hidden route's client state alive across navigations.
 */
export function useServerState<Value>(
	serverValue: Value
): [Value, Dispatch<SetStateAction<Value>>] {
	const [value, setValue] = useState(serverValue)
	const [seen, setSeen] = useState(serverValue)
	if (seen !== serverValue) {
		setSeen(serverValue)
		setValue(serverValue)
	}
	return [value, setValue]
}
