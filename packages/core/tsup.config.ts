import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/physics/index.ts',
    'src/rendering/index.ts',
    'src/utils/index.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', 'three', 'react-force-graph-3d', 'd3-force-3d'],
  esbuildOptions(options) {
    options.banner = {
      js: `/**
 * Gravital Ecosystem Visualization
 * Framework-agnostic 3D visualization for Gravital Ecosystem
 * @license MIT
 */`,
    };
  },
});