import { appTools, defineConfig } from '@modern-js/app-tools';
import { tailwindcssPlugin } from '@modern-js/plugin-tailwindcss';
import { bffPlugin } from '@modern-js/plugin-bff';
import { expressPlugin } from '@modern-js/plugin-express';
import { ssgPlugin } from '@modern-js/plugin-ssg';

// https://modernjs.dev/en/configure/app/usage
export default defineConfig({
  runtime: {
    router: true,
  },
  output: {
    ssg: true,
  },
  plugins: [
    appTools({
      bundler: 'webpack',
      // bundler: 'experimental-rspack',
    }),
    tailwindcssPlugin(),
    bffPlugin(),
    expressPlugin(),
    ssgPlugin(),
  ],
});
