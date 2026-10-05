import { X509Certificate } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { databaseSsl, isLoopbackDatabase } from './tls'

describe('databaseSsl', () => {
	it('trusts the Supabase root CA and never turns verification off', () => {
		const ssl = databaseSsl()
		if (!ssl) throw new Error('a remote database must use TLS')

		expect(new X509Certificate(ssl.ca).subject).toContain('CN=Supabase Root 2021 CA')
		expect(ssl).not.toHaveProperty('rejectUnauthorized', false)
	})

	it('turns TLS off only for a database on this machine, like the throwaway one in CI', () => {
		for (const url of [
			'postgresql://postgres:pw@localhost:5432/postgres',
			'postgresql://postgres:pw@127.0.0.1:5432/postgres',
			'postgresql://postgres:pw@[::1]:5432/postgres'
		]) {
			expect(isLoopbackDatabase(url)).toBe(true)
			expect(databaseSsl(url)).toBe(false)
		}
	})

	it('keeps verified TLS for every other host, and when there is no URL', () => {
		for (const url of [
			'postgresql://postgres.abc:pw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
			'postgresql://postgres:pw@localhost.evil.example:5432/postgres',
			undefined,
			'not a url'
		]) {
			expect(isLoopbackDatabase(url)).toBe(false)
			expect(databaseSsl(url)).toHaveProperty('ca')
		}
	})
})
