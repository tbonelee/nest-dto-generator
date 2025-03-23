import ts from 'typescript';
import { dirname } from 'path';

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (path) => path,
  getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
  getNewLine: () => ts.sys.newLine,
};

export function getProgram(tsconfigPath: string) {
  const configFile = ts.readConfigFile(tsconfigPath, (path) =>
    ts.sys.readFile(path),
  );
  if (configFile.error) {
    throw new Error(ts.formatDiagnostic(configFile.error, formatHost));
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dirname(tsconfigPath),
  );
  if (parsedConfig.errors.length > 0) {
    throw new Error(ts.formatDiagnostic(parsedConfig.errors[0], formatHost));
  }

  return ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
  });
}

export function extractClasses(program: ts.Program): ts.ClassDeclaration[] {
  const sourceFiles = program.getSourceFiles();
  const classes: ts.ClassDeclaration[] = [];

  sourceFiles.forEach((file) => {
    file.forEachChild((node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        classes.push(node);
      }
    });
  });

  return classes;
}
