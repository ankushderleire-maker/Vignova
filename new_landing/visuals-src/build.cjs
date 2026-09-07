const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const dependencyRoot = path.resolve(__dirname, '../../LandingCode');
const appRequire = createRequire(path.join(dependencyRoot, 'package.json'));
const { webpack } = appRequire('next/dist/compiled/webpack/webpack');
const { compile, optimize } = appRequire('@tailwindcss/node');
const { Scanner } = appRequire('@tailwindcss/oxide');
const destination = path.resolve(__dirname, '../visuals');

(async () => {
  fs.mkdirSync(destination, { recursive: true });
  const css = fs.readFileSync(path.join(__dirname, 'theme.css'), 'utf8');
  const compiled = await compile(css, { base: __dirname, onDependency() {} });
  const scanner = new Scanner({ sources: [{ base: __dirname, pattern: '**/*.tsx', negated: false }] });
  const result = optimize(compiled.build(scanner.scan()), { minify: true });
  fs.writeFileSync(path.join(destination, 'demo.css'), result.code);
  const compiler = webpack({
    mode: 'production',
    entry: path.join(__dirname, 'index.tsx'),
    output: { path: destination, filename: 'demo.js', iife: true },
    resolve: { modules: [path.join(dependencyRoot, 'node_modules'), 'node_modules'], extensions: ['.tsx', '.ts', '.js', '.mjs'], fullySpecified: false },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: path.join(__dirname, 'tsx-loader.cjs') }] },
    devtool: false,
    performance: { hints: false },
    optimization: { minimize: false },
  });
  compiler.run(async (error, stats) => {
    compiler.close(() => {});
    if (error || stats.hasErrors()) {
      console.error(error || stats.toString({ all: false, errors: true, errorDetails: true }));
      process.exitCode = 1;
    } else {
      try {
        const swc = appRequire('next/dist/build/swc');
        await swc.loadBindings();
        const filename = path.join(destination, 'demo.js');
        const result = await swc.minify(fs.readFileSync(filename, 'utf8'), { compress: true, mangle: true, format: { comments: false } });
        fs.writeFileSync(filename, result.code);
        console.log('Compiled and optimized product animations: ' + Math.round(Buffer.byteLength(result.code) / 1024) + ' KB.');
      } catch (error) { console.error(error); process.exitCode = 1; }
    }
  });
})().catch(error => { console.error(error); process.exitCode = 1; });
