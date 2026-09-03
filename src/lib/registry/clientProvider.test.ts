import { it, expect } from 'vitest';
import { ClientRegistryProvider } from '$lib/registry/client';
import { SolveWindowRegistry } from '../../routes/problem/[problem_id]/[session_id]/windowRegistry';
import { ProblemEditorWindowRegistry } from '../../routes/edit/[slug]/windowRegistry';
import { TelemetryRegistry } from '$lib/telemetry';

it('client provider constructs all registries without module-cycle breakage', async () => {
  const provider = ClientRegistryProvider.instance();
  expect(provider).toBeInstanceOf(ClientRegistryProvider);
  const solve = provider.getRegistry(SolveWindowRegistry);
  expect(solve.keys().sort()).toEqual(['code_editor', 'custom_code', 'problem_info', 'test_cases']);
  expect(await provider.getRegistryById('animorank:window.solve')).toBe(solve);
  const edit = provider.getRegistry(ProblemEditorWindowRegistry);
  expect(edit.keys().sort()).toEqual(['functions', 'metadata', 'properties', 'starter_code', 'test_cases']);
  expect(await provider.getRegistryById('animorank:window.problem_editor')).toBe(edit);
  const telemetry = provider.getRegistry(TelemetryRegistry);
  expect(telemetry.keys()).toContain('console');
  expect(await provider.getRegistryById('animorank:telemetry')).toBe(telemetry);
  // class-keyed access retained for the same registries
  expect(provider.getRegistry(SolveWindowRegistry)).toBe(solve);
});
