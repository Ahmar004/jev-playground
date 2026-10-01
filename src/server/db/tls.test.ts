import { X509Certificate } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { databaseSsl } from './tls'

describe('databaseSsl', () => {
	it('trusts the Supabase root CA and never turns verification off', () => {
		const ssl = databaseSsl()

		expect(new X509Certificate(ssl.ca).subject).toContain('CN=Supabase Root 2021 CA')
		expect(ssl).not.toHaveProperty('rejectUnauthorized', false)
	})
})
