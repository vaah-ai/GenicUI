/**
 * Trust tiers — tests for F38 registry trust tiers (project / user / remote).
 *
 * Covers:
 * - F38-AC1: Project tier wins on conflict
 * - F38-AC2: Remote allow-list enforced
 * - F38-AC3: Lookup order: user → project → remote
 *
 * @module @genicui/server/registry/trust-tiers.test
 */

import { describe, it, expect } from 'bun:test';
import { Type } from '@sinclair/typebox';
import {
  TieredRegistry,
  globMatch,
  isRemoteAllowed,
  getRemoteAllowList,
  tierPriority,
} from './trust-tiers.js';
import type { ComponentEntry, RegistryTier } from './types.js';

// ---------------------------------------------------------------------------
// Helpers — create mock ComponentEntry instances
// ---------------------------------------------------------------------------

function mockEntry(
  name: string,
  version: string,
  options: { framework?: string; tags?: string[] } = {},
): ComponentEntry {
  return {
    name,
    version,
    uri: `ui://components/${name}@${version}`,
    propsSchema: Type.Object({}, { additionalProperties: false }),
    framework: options.framework ?? 'test',
    tags: options.tags ?? [],
    events: [],
    examples: [],
  };
}

// ---------------------------------------------------------------------------
// Glob matching tests
// ---------------------------------------------------------------------------

describe('globMatch', () => {
  it('matches exact string', () => {
    expect(globMatch('@official/primevue', '@official/primevue')).toBe(true);
  });

  it('matches * wildcard for single path segment', () => {
    expect(globMatch('@official/primevue', '@official/*')).toBe(true);
    expect(globMatch('@official/mantine', '@official/*')).toBe(true);
  });

  it('does not match * across path segments', () => {
    expect(globMatch('@official/sub/primevue', '@official/*')).toBe(false);
  });

  it('matches ** wildcard for any path segments', () => {
    expect(globMatch('@official/sub/primevue', '@official/**')).toBe(true);
    expect(globMatch('@official/primevue', '@official/**')).toBe(true);
  });

  it('matches ? for single character', () => {
    expect(globMatch('@org/a', '@org/?')).toBe(true);
    expect(globMatch('@org/ab', '@org/?')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// F38-AC1: Project tier wins on conflict
// ---------------------------------------------------------------------------

describe('F38-AC1: Project wins on conflict', () => {
  it('project version is returned when project and remote have the same component', () => {
    const registry = new TieredRegistry();

    // Add remote entry first
    const remoteMap = new Map<string, ComponentEntry>();
    remoteMap.set('ui://components/data-table@2.0.0', mockEntry('data-table', '2.0.0', { framework: '@official/primevue' }));
    registry.addEntries(remoteMap, 'remote', {
      allowList: { patterns: ['@official/*'] },
    });

    // Add project entry (different version)
    const projectMap = new Map<string, ComponentEntry>();
    projectMap.set('ui://components/data-table@1.0.0', mockEntry('data-table', '1.0.0'));
    registry.addEntries(projectMap, 'project');

    // Look up — project should win
    const result = registry.find('data-table');
    expect(result).toBeDefined();
    expect(result!.version).toBe('1.0.0');
    expect(result!.tier).toBe('project');
  });

  it('project wins even when remote version is higher', () => {
    const registry = new TieredRegistry();

    const remoteMap = new Map<string, ComponentEntry>();
    remoteMap.set('ui://components/data-table@9.9.9', mockEntry('data-table', '9.9.9', { framework: '@official/primevue' }));
    registry.addEntries(remoteMap, 'remote', {
      allowList: { patterns: ['@official/*'] },
    });

    const projectMap = new Map<string, ComponentEntry>();
    projectMap.set('ui://components/data-table@1.0.0', mockEntry('data-table', '1.0.0'));
    registry.addEntries(projectMap, 'project');

    const result = registry.find('data-table');
    expect(result!.version).toBe('1.0.0');
    expect(result!.tier).toBe('project');
  });

  it('project is not returned if only remote has the component', () => {
    const registry = new TieredRegistry();

    const remoteMap = new Map<string, ComponentEntry>();
    remoteMap.set('ui://components/unique-component@1.0.0', mockEntry('unique-component', '1.0.0', { framework: '@official/ui' }));
    registry.addEntries(remoteMap, 'remote', {
      allowList: { patterns: ['@official/*'] },
    });

    // No project entry for this component
    const result = registry.find('unique-component');
    expect(result).toBeDefined();
    expect(result!.tier).toBe('remote');
    expect(result!.version).toBe('1.0.0');
  });
});

// ---------------------------------------------------------------------------
// F38-AC2: Remote allow-list enforced
// ---------------------------------------------------------------------------

describe('F38-AC2: Remote allow-list enforced', () => {
  it('allows remote entries matching the allow-list pattern', () => {
    const registry = new TieredRegistry();

    const remoteMap = new Map<string, ComponentEntry>();
    remoteMap.set('ui://components/data-table@1.0.0', mockEntry('data-table', '1.0.0', { framework: '@official/primevue' }));

    const added = registry.addEntries(remoteMap, 'remote', {
      allowList: { patterns: ['@official/*'] },
    });

    expect(added.length).toBe(1);
    expect(added[0]!.name).toBe('data-table');
  });

  it('rejects remote entries not matching the allow-list pattern', () => {
    const registry = new TieredRegistry();

    const remoteMap = new Map<string, ComponentEntry>();
    remoteMap.set('ui://components/data-table@1.0.0', mockEntry('data-table', '1.0.0', { framework: '@malicious/registry' }));

    const added = registry.addEntries(remoteMap, 'remote', {
      allowList: { patterns: ['@official/*'] },
    });

    expect(added.length).toBe(0);
    // The entry should not be in the registry
    expect(registry.size).toBe(0);
  });

  it('uses default allow-list when none is provided', () => {
    const registry = new TieredRegistry();

    const remoteMap = new Map<string, ComponentEntry>();
    remoteMap.set('ui://components/data-table@1.0.0', mockEntry('data-table', '1.0.0', { framework: '@official/primevue' }));

    // No allowList option — should use default
    const added = registry.addEntries(remoteMap, 'remote');

    // Default is '@official/*' — should pass
    expect(added.length).toBe(1);
  });

  it('rejects entries not matching the default allow-list', () => {
    const registry = new TieredRegistry();

    const remoteMap = new Map<string, ComponentEntry>();
    remoteMap.set('ui://components/evil@1.0.0', mockEntry('evil', '1.0.0', { framework: '@evil/registry' }));

    const added = registry.addEntries(remoteMap, 'remote');

    expect(added.length).toBe(0);
  });

  it('allows multiple patterns in the allow-list', () => {
    const registry = new TieredRegistry();

    const remoteMap = new Map<string, ComponentEntry>();
    remoteMap.set('ui://components/comp1@1.0.0', mockEntry('comp1', '1.0.0', { framework: '@official/ui' }));
    remoteMap.set('ui://components/comp2@1.0.0', mockEntry('comp2', '1.0.0', { framework: '@trusted/ui' }));

    const added = registry.addEntries(remoteMap, 'remote', {
      allowList: { patterns: ['@official/*', '@trusted/*'] },
    });

    expect(added.length).toBe(2);
  });

  it('does not enforce allow-list for non-remote tiers', () => {
    const registry = new TieredRegistry();

    const projectMap = new Map<string, ComponentEntry>();
    projectMap.set('ui://components/data-table@1.0.0', mockEntry('data-table', '1.0.0', { framework: '@anyone/registry' }));

    // Project tier — no allow-list enforcement
    const added = registry.addEntries(projectMap, 'project');
    expect(added.length).toBe(1);

    const userMap = new Map<string, ComponentEntry>();
    userMap.set('ui://components/data-table@2.0.0', mockEntry('data-table', '2.0.0', { framework: '@anyone/registry' }));

    // User tier — no allow-list enforcement
    const userAdded = registry.addEntries(userMap, 'user');
    expect(userAdded.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// F38-AC3: Lookup order — user → project → remote
// ---------------------------------------------------------------------------

describe('F38-AC3: Lookup order: user → project → remote', () => {
  it('returns user tier entry when user has the component', () => {
    const registry = new TieredRegistry();

    // Add to all three tiers
    const projectMap = new Map<string, ComponentEntry>();
    projectMap.set('ui://components/data-table@1.0.0', mockEntry('data-table', '1.0.0'));
    registry.addEntries(projectMap, 'project');

    const userMap = new Map<string, ComponentEntry>();
    userMap.set('ui://components/data-table@2.0.0', mockEntry('data-table', '2.0.0'));
    registry.addEntries(userMap, 'user');

    const remoteMap = new Map<string, ComponentEntry>();
    remoteMap.set('ui://components/data-table@3.0.0', mockEntry('data-table', '3.0.0', { framework: '@official/primevue' }));
    registry.addEntries(remoteMap, 'remote', {
      allowList: { patterns: ['@official/*'] },
    });

    // User tier should win (lookup order: user → project → remote)
    const result = registry.find('data-table');
    expect(result).toBeDefined();
    expect(result!.tier).toBe('user');
    expect(result!.version).toBe('2.0.0');
  });

  it('falls through to project when user tier has no match', () => {
    const registry = new TieredRegistry();

    const projectMap = new Map<string, ComponentEntry>();
    projectMap.set('ui://components/data-table@1.0.0', mockEntry('data-table', '1.0.0'));
    registry.addEntries(projectMap, 'project');

    const remoteMap = new Map<string, ComponentEntry>();
    remoteMap.set('ui://components/data-table@2.0.0', mockEntry('data-table', '2.0.0', { framework: '@official/primevue' }));
    registry.addEntries(remoteMap, 'remote', {
      allowList: { patterns: ['@official/*'] },
    });

    // No user entry — project should win
    const result = registry.find('data-table');
    expect(result).toBeDefined();
    expect(result!.tier).toBe('project');
    expect(result!.version).toBe('1.0.0');
  });

  it('falls through to remote when user and project have no match', () => {
    const registry = new TieredRegistry();

    const remoteMap = new Map<string, ComponentEntry>();
    remoteMap.set('ui://components/remote-only@1.0.0', mockEntry('remote-only', '1.0.0', { framework: '@official/primevue' }));
    registry.addEntries(remoteMap, 'remote', {
      allowList: { patterns: ['@official/*'] },
    });

    const result = registry.find('remote-only');
    expect(result).toBeDefined();
    expect(result!.tier).toBe('remote');
    expect(result!.version).toBe('1.0.0');
  });

  it('returns undefined when no tier has the component', () => {
    const registry = new TieredRegistry();

    const result = registry.find('does-not-exist');
    expect(result).toBeUndefined();
  });

  it('finds by specific version', () => {
    const registry = new TieredRegistry();

    const projectMap = new Map<string, ComponentEntry>();
    projectMap.set('ui://components/data-table@1.0.0', mockEntry('data-table', '1.0.0'));
    projectMap.set('ui://components/data-table@2.0.0', mockEntry('data-table', '2.0.0'));
    registry.addEntries(projectMap, 'project');

    // Find specific version
    const result = registry.find('data-table', '1.0.0');
    expect(result).toBeDefined();
    expect(result!.version).toBe('1.0.0');
    expect(result!.tier).toBe('project');
  });

  it('case-insensitive name lookup', () => {
    const registry = new TieredRegistry();

    const projectMap = new Map<string, ComponentEntry>();
    projectMap.set('ui://components/DataTable@1.0.0', mockEntry('DataTable', '1.0.0'));
    registry.addEntries(projectMap, 'project');

    // Lookup with different case
    const result = registry.find('datatable');
    expect(result).toBeDefined();
    expect(result!.name).toBe('DataTable');
  });
});

// ---------------------------------------------------------------------------
// Tier priority helper
// ---------------------------------------------------------------------------

describe('tierPriority', () => {
  it('project has highest priority', () => {
    expect(tierPriority('project')).toBe(3);
  });

  it('user has medium priority', () => {
    expect(tierPriority('user')).toBe(2);
  });

  it('remote has lowest priority', () => {
    expect(tierPriority('remote')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Remote allow-list helper
// ---------------------------------------------------------------------------

describe('isRemoteAllowed', () => {
  it('returns true for matching patterns', () => {
    expect(isRemoteAllowed('@official/primevue', { patterns: ['@official/*'] })).toBe(true);
  });

  it('returns false for non-matching patterns', () => {
    expect(isRemoteAllowed('@malicious/primevue', { patterns: ['@official/*'] })).toBe(false);
  });

  it('returns true if any pattern matches', () => {
    expect(isRemoteAllowed('@trusted/ui', {
      patterns: ['@official/*', '@trusted/*'],
    })).toBe(true);
  });

  it('returns false for empty patterns list', () => {
    expect(isRemoteAllowed('@official/ui', { patterns: [] })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TieredRegistry size and metadata
// ---------------------------------------------------------------------------

describe('TieredRegistry size and metadata', () => {
  it('reports correct size across tiers', () => {
    const registry = new TieredRegistry();

    const projectMap = new Map<string, ComponentEntry>();
    projectMap.set('ui://components/comp1@1.0.0', mockEntry('comp1', '1.0.0'));
    registry.addEntries(projectMap, 'project');

    const userMap = new Map<string, ComponentEntry>();
    userMap.set('ui://components/comp2@1.0.0', mockEntry('comp2', '1.0.0'));
    registry.addEntries(userMap, 'user');

    const remoteMap = new Map<string, ComponentEntry>();
    remoteMap.set('ui://components/comp3@1.0.0', mockEntry('comp3', '1.0.0', { framework: '@official/ui' }));
    registry.addEntries(remoteMap, 'remote', {
      allowList: { patterns: ['@official/*'] },
    });

    expect(registry.size).toBe(3);
    expect(registry.isEmpty).toBe(false);
  });

  it('isEmpty returns true when no entries', () => {
    const registry = new TieredRegistry();
    expect(registry.isEmpty).toBe(true);
  });

  it('listNames returns unique names across tiers', () => {
    const registry = new TieredRegistry();

    const projectMap = new Map<string, ComponentEntry>();
    projectMap.set('ui://components/data-table@1.0.0', mockEntry('data-table', '1.0.0'));
    registry.addEntries(projectMap, 'project');

    const userMap = new Map<string, ComponentEntry>();
    userMap.set('ui://components/data-table@2.0.0', mockEntry('data-table', '2.0.0'));
    userMap.set('ui://components/counter@1.0.0', mockEntry('counter', '1.0.0'));
    registry.addEntries(userMap, 'user');

    const names = registry.listNames();
    expect(names).toContain('data-table');
    expect(names).toContain('counter');
    expect(names.length).toBe(2);
  });

  it('getTierMaps returns separate maps', () => {
    const registry = new TieredRegistry();

    const projectMap = new Map<string, ComponentEntry>();
    projectMap.set('ui://components/comp1@1.0.0', mockEntry('comp1', '1.0.0'));
    registry.addEntries(projectMap, 'project');

    const remoteMap = new Map<string, ComponentEntry>();
    remoteMap.set('ui://components/comp2@1.0.0', mockEntry('comp2', '1.0.0', { framework: '@official/ui' }));
    registry.addEntries(remoteMap, 'remote', {
      allowList: { patterns: ['@official/*'] },
    });

    const maps = registry.getTierMaps();
    expect(maps.project.size).toBe(1);
    expect(maps.user.size).toBe(0);
    expect(maps.remote.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('Edge cases', () => {
  it('handles empty maps', () => {
    const registry = new TieredRegistry();
    const empty = new Map<string, ComponentEntry>();
    registry.addEntries(empty, 'project');
    expect(registry.size).toBe(0);
  });

  it('handles duplicate URIs within same tier', () => {
    const registry = new TieredRegistry();

    const projectMap = new Map<string, ComponentEntry>();
    const entry = mockEntry('data-table', '1.0.0');
    projectMap.set('ui://components/data-table@1.0.0', entry);
    // Adding same URI again — Map will overwrite, so only 1 entry
    registry.addEntries(projectMap, 'project');
    expect(registry.size).toBe(1);
  });

  it('handles version lookup when version does not exist in any tier', () => {
    const registry = new TieredRegistry();

    const projectMap = new Map<string, ComponentEntry>();
    projectMap.set('ui://components/data-table@1.0.0', mockEntry('data-table', '1.0.0'));
    registry.addEntries(projectMap, 'project');

    const result = registry.find('data-table', '9.9.9');
    expect(result).toBeUndefined();
  });
});