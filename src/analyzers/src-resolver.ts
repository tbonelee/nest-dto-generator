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

/**
 * Check if the class is a controller class.
 * Check by nestjs Controller decorator.
 * @param classes - The list of classes to check
 * @returns The list of controller classes
 */
export function filterControllerClasses(
  classes: ts.ClassDeclaration[],
): ts.ClassDeclaration[] {
  return classes.filter((cls) => {
    const decorators = ts.canHaveDecorators(cls)
      ? ts.getDecorators(cls)
      : undefined;
    if (!decorators) return false;

    return decorators.some((decorator) => {
      if (!ts.isCallExpression(decorator.expression)) return false;

      const expression = decorator.expression.expression;
      if (!ts.isIdentifier(expression)) return false;

      return expression.text === 'Controller';
    });
  });
}
