import { build } from 'esbuild';
import { copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const isDev = process.argv.includes('--dev');
const isWatch = process.argv.includes('--watch');

const baseConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/index.js',
  external: [
    // Keep these as external dependencies
    'discord.js',
    'axios',
    'cheerio',
    'fs-extra',
    'lowdb',
    'progress',
    'dotenv'
  ],
  sourcemap: isDev,
  minify: !isDev,
  keepNames: true,
  metafile: true,
};

async function buildApp() {
  try {
    // Ensure dist directory exists
    if (!existsSync('dist')) {
      await mkdir('dist', { recursive: true });
    }

    console.log('🚀 Building with esbuild...');
    const startTime = Date.now();
    
    const result = await build(baseConfig);
    
    const buildTime = Date.now() - startTime;
    console.log(`✅ Build completed in ${buildTime}ms`);
    
    if (result.metafile) {
      const esbuild = await import('esbuild');
      const analysis = await esbuild.analyzeMetafile(result.metafile);
      console.log('\n📊 Bundle analysis:');
      console.log(analysis);
    }
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

if (isWatch) {
  console.log('👀 Watching for changes...');
  const ctx = await build({
    ...baseConfig,
    sourcemap: true,
    minify: false,
  }).catch(() => process.exit(1));
  
  await ctx.watch();
} else {
  await buildApp();
}