// Optional maintenance command; ordinary builds copy the committed vendor bundle.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = process.cwd();
const modules = path.resolve(process.env.PREACHERMAN_VENDOR_MODULES || 'node_modules');
const require = createRequire(path.join(modules, '.preacherman-vendor.cjs'));
for (const [name, version] of [['three', '0.185.1'], ['esbuild', '0.25.12']]) {
  const installed = JSON.parse(fs.readFileSync(path.join(modules, name, 'package.json'), 'utf8'));
  if (installed.version !== version) throw new Error(`Expected ${name} ${version}`);
}
const esbuild = require(path.join(modules, 'esbuild'));
esbuild.buildSync({
  stdin: { contents: fs.readFileSync(path.join(root, 'scripts/pathfinder-three-entry.mjs'), 'utf8'), resolveDir: root, sourcefile: 'pathfinder-three-entry.js' },
  nodePaths: [modules],
  outfile: path.join(root, 'work/vendor/three-pathfinder-0.185.1.js'),
  bundle: true, format: 'esm', platform: 'browser', minify: true, target: ['es2022'], legalComments: 'inline',
  banner: { js: '/* Three.js 0.185.1 + GLTFLoader + RectAreaLightUniformsLib. MIT; see three-LICENSE.txt. */' },
});
console.log('Bundled pinned Three.js runtime.');
