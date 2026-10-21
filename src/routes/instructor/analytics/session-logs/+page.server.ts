import type { PageServerLoad } from './$types';
import { SessionLogService } from '$lib/analytics';
import { ServerRegistryProvider } from '$lib/registry/server';

export const load: PageServerLoad = async ({ url }) => {
  const service = await ServerRegistryProvider.instance().getService(SessionLogService);
  const params = url.searchParams;
  return service.getSessionLogs({
    set: params.get('set'),
    problem: params.get('problem'),
    user: params.get('user'),
    session: params.get('session'),
    type: params.get('type')
  });
};
