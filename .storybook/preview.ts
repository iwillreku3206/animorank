import '../src/app.css';

import type { Preview } from '@storybook/sveltekit';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#232323' },
        { name: 'light', value: '#ffffff' }
      ]
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    }
  }
};

export default preview;
