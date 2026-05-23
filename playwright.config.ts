import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  webServer: {
    command: 'npm run preview',
    port: 4173,
    wait: {
      stdout: /localhost/
    },
    env: { ...process.env, SSL_DEV_SERVER: 'false' }
  },
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
