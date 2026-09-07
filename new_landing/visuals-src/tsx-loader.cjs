const path = require('path');
const ts = require('module').createRequire(path.resolve(__dirname, '../../LandingCode/package.json'))('typescript');
module.exports = function(source) {
  const result = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, esModuleInterop: true },
    fileName: this.resourcePath,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, { getCurrentDirectory: () => __dirname, getCanonicalFileName: f => f, getNewLine: () => '\n' }));
  return result.outputText;
};
