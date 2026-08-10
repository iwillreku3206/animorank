import '../src/yfm.css';
import '../src/app.css';
import 'katex/dist/katex.min.css';
import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import '@diplodoc/transform/dist/css/yfm.css';
import 'dockview-core/dist/styles/dockview.css';
import '$lib/window/animorank-theme.css';

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
