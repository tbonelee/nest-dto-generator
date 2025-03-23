import ts from 'typescript';
import { dirname } from 'path';

/**
 * Error thrown when a Controller decorator is used incorrectly
 */
export class InvalidControllerDecoratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidControllerDecoratorError';
  }
}

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

interface ControllerInfo {
  class: ts.ClassDeclaration;
  path: string[];
}

/**
 * Check if a decorator is a Controller decorator
 */
function isControllerDecorator(decorator: ts.Decorator): boolean {
  if (!ts.isCallExpression(decorator.expression)) return false;

  const expression = decorator.expression.expression;
  if (!ts.isIdentifier(expression)) return false;

  return expression.text === 'Controller';
}

/**
 * Get the path from a Controller decorator
 */
function getControllerPath(
  decorator: ts.Decorator,
  program: ts.Program,
): string[] {
  if (!ts.isCallExpression(decorator.expression)) {
    throw new InvalidControllerDecoratorError(
      'Controller decorator must be a function call',
    );
  }

  const firstArg = decorator.expression.arguments[0];
  if (!firstArg) return []; // No argument means empty path array

  if (ts.isObjectLiteralExpression(firstArg)) {
    return getPathFromOptions(firstArg, program);
  }

  if (ts.isArrayLiteralExpression(firstArg)) {
    return getPathFromArray(firstArg.elements, program);
  }

  const path = getPathFromArgument(firstArg, program);
  if (path === undefined) {
    throw new InvalidControllerDecoratorError(
      'Controller decorator path must be a string, string array, or ControllerOptions object',
    );
  }
  return path;
}

/**
 * Get the path from an array of path elements
 */
function getPathFromArray(
  elements: ts.NodeArray<ts.Expression>,
  program: ts.Program,
): string[] {
  if (elements.length === 0) {
    throw new InvalidControllerDecoratorError(
      'Controller decorator path array cannot be empty',
    );
  }

  const paths: string[] = [];
  for (const element of elements) {
    if (ts.isStringLiteral(element)) {
      paths.push(element.text);
    } else {
      const path = getPathFromArgument(element, program);
      if (path) {
        paths.push(...path);
      } else {
        throw new InvalidControllerDecoratorError(
          'Controller decorator array elements must be strings or string variables',
        );
      }
    }
  }

  return paths;
}

/**
 * Get the path from an object literal (ControllerOptions)
 */
function getPathFromOptions(
  arg: ts.ObjectLiteralExpression,
  program: ts.Program,
): string[] {
  const pathProperty = arg.properties.find((prop) => {
    if (!ts.isPropertyAssignment(prop)) return false;
    if (!ts.isIdentifier(prop.name)) return false;
    return prop.name.text === 'path';
  });

  // If path property is not present, return empty array
  if (!pathProperty) return [];

  if (!ts.isPropertyAssignment(pathProperty)) {
    throw new InvalidControllerDecoratorError(
      'Controller decorator path property must be a property assignment',
    );
  }

  const initializer = pathProperty.initializer;
  if (ts.isStringLiteral(initializer)) {
    return [initializer.text];
  }

  if (ts.isArrayLiteralExpression(initializer)) {
    return getPathFromArray(initializer.elements, program);
  }

  const path = getPathFromArgument(initializer, program);
  if (path === undefined) {
    throw new InvalidControllerDecoratorError(
      'Controller decorator path property must be a string, string array, or string variable',
    );
  }
  return path;
}

/**
 * Get the path from a string literal or variable reference
 */
function getPathFromArgument(
  arg: ts.Node,
  program: ts.Program,
): string[] | undefined {
  if (ts.isStringLiteral(arg)) {
    return [arg.text];
  }

  if (ts.isIdentifier(arg)) {
    const symbol = program.getTypeChecker().getSymbolAtLocation(arg);
    if (!symbol) return undefined;

    const declarations = symbol.getDeclarations();
    if (!declarations?.length) return undefined;

    const declaration = declarations[0];
    if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) {
      return undefined;
    }

    if (ts.isStringLiteral(declaration.initializer)) {
      return [declaration.initializer.text];
    }
  }

  return undefined;
}

/**
 * Check if the class is a controller class and get its path.
 * Check by nestjs Controller decorator.
 * @param classes - The list of classes to check
 * @param program - The TypeScript program
 * @returns The list of controller classes with their paths
 */
export function filterControllerClasses(
  classes: ts.ClassDeclaration[],
  program: ts.Program,
): ControllerInfo[] {
  return classes
    .map((cls) => {
      const decorators = ts.canHaveDecorators(cls)
        ? ts.getDecorators(cls)
        : undefined;
      if (!decorators) return null;

      const controllerDecorator = decorators.find(isControllerDecorator);
      if (!controllerDecorator) return null;

      const path = getControllerPath(controllerDecorator, program);
      if (path === undefined) return null;

      return { class: cls, path };
    })
    .filter((info) => info !== null);
}
