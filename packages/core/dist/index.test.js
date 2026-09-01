import { describe, it, expect } from "bun:test";
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
/**
 * M1-T1 — @genicui/core package tests.
 *
 * Maps to Feature F1 acceptance criteria:
 * - F1-AC1: TypeScript resolution < 50 ms
 * - F1-AC2: ESM compatibility (Node 20+, Bun 1.2+, Deno 1.40+)
 * - F1-AC3: Zero `any` types (ESLint enforced)
 */
describe("F1: @genicui/core", () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const coreDir = resolve(__dirname, "..");
    const srcUrl = pathToFileURL(resolve(__dirname, "./index.ts")).href;
    describe("F1-AC1: TypeScript resolution < 50 ms", () => {
        it("imports and resolves in under 50 ms", async () => {
            const start = performance.now();
            const mod = await import(srcUrl);
            const { VERSION } = mod;
            const elapsed = performance.now() - start;
            expect(elapsed).toBeLessThan(50);
            expect(VERSION).toBe("0.1.0");
        });
    });
    describe("F1-AC2: ESM compatibility", () => {
        it("exports VERSION as a string via ESM", async () => {
            const mod = await import(srcUrl);
            expect(mod.VERSION).toBeTypeOf("string");
            expect(mod.VERSION).toMatch(/^\d+\.\d+\.\d+$/);
        });
        it("has no default export (named-only ESM)", async () => {
            const mod = await import(srcUrl);
            expect(mod.default).toBeUndefined();
        });
    });
    describe("F1-AC3: Zero `any` types (ESLint enforced)", () => {
        it("ESLint runs without errors on src/", () => {
            // eslint is a devDependency; run it from the package directory.
            const output = execSync("bun run lint", {
                cwd: coreDir,
                stdio: "pipe",
                encoding: "utf-8"
            }).toString();
            // ESLint exits 0 on success; output is empty.
            expect(output.trim()).toBe("");
        });
    });
});
//# sourceMappingURL=index.test.js.map