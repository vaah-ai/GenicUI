/**
 * Server integration tests — F9 acceptance criteria.
 *
 * @module @genicui/server/server.test
 * @see {F9-AC1} — /health returns 200 with { status: 'ok' } in <10ms
 * @see {F9-AC2} — Bun missing → actionable error
 * @see {F9-AC3} — TypeScript strict mode, no `any`
 */
import { describe, it, expect, beforeAll } from 'bun:test';
import { execSync } from 'node:child_process';
import { createServer } from './index.js';
const PORT = 3040;
describe('F9 — Bun + Elysia HTTP server skeleton', () => {
    let baseUrl;
    beforeAll(() => {
        const app = createServer();
        const url = app.server.url;
        baseUrl = String(url).replace(/\/$/, '');
    });
    describe('F9-AC1: /health under 10ms', () => {
        it('returns 200 with { status: "ok" }', async () => {
            const response = await fetch(`${baseUrl}/health`);
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body).toEqual({ status: 'ok' });
        });
        it('responds in under 10ms', async () => {
            const start = Date.now();
            await fetch(`${baseUrl}/health`);
            const elapsed = Date.now() - start;
            expect(elapsed).toBeLessThan(10);
        });
    });
    describe('F9-AC2: Bun missing error', () => {
        it('package.json scripts reference bun', () => {
            const pkgDir = import.meta.dir + '/../';
            const pkgText = execSync(`cat "${pkgDir}package.json"`, {
                encoding: 'utf8'
            });
            const pkgJson = JSON.parse(pkgText);
            expect(pkgJson.scripts.dev).toContain('bun');
            expect(pkgJson.scripts.start).toContain('bun');
        });
    });
    describe('F9-AC3: No `any` types', () => {
        it('ESLint reports no no-explicit-any violations', () => {
            const pkgDir = import.meta.dir + '/../';
            const result = execSync(`bun run lint`, {
                cwd: pkgDir,
                encoding: 'utf8',
                stdio: 'pipe'
            });
            expect(result.trim()).toBe('');
        });
    });
});
//# sourceMappingURL=server.test.js.map