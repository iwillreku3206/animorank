import type { PageServerLoad } from './$types';
import { AnalyticsService } from '$lib/analytics';
import { ServerRegistryProvider } from '$lib/registry/server';

export const load: PageServerLoad = async ({ url }) => {
  const service = await ServerRegistryProvider.instance().getService(AnalyticsService);
  return service.getDashboard(url.searchParams.get('range'));
};
