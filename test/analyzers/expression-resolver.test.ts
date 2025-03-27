import {
  ResolverResult,
  resolveToLiteral,
} from '../../src/analyzers/expression-resolver';
import ts from 'typescript';
import { expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Expression Resolver', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'nest-dto-generator-test-'),
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const parseCode = (
    code: string,
  ): {
    statements: ts.NodeArray<ts.Statement>;
    program: ts.Program;
  } => {
    const tempFilePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(tempFilePath, code);

    const program = ts.createProgram([tempFilePath], {
      target: ts.ScriptTarget.Latest,
    });
    const sourceFile = program.getSourceFile(tempFilePath);
    expect(sourceFile).toBeDefined();
    return {
      statements: sourceFile!.statements,
      program: program,
    };
  };

  const getFirstExpression = (stmts: ts.NodeArray<ts.Statement>): ts.Node => {
    expect(stmts.length).toBeGreaterThanOrEqual(1);
    expect(stmts[0].kind).toBe(ts.SyntaxKind.ExpressionStatement);

    return (stmts[0] as ts.ExpressionStatement).expression;
  };

  describe('Primitive Types', () => {
    describe('Numbers', () => {
      it('should resolve decimal numbers', () => {
        const { statements, program } = parseCode('123');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('NumericLiteral');
        expect(result.value).toBe(123);
      });

      it('should resolve negative numbers', () => {
        const { statements, program } = parseCode('-123');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('NumericLiteral');
        expect(result.value).toBe(-123);
      });

      it('should resolve floating point numbers', () => {
        const { statements, program } = parseCode('123.45');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('NumericLiteral');
        expect(result.value).toBe(123.45);
      });

      it('should resolve scientific notation', () => {
        const { statements, program } = parseCode('1.23e4');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('NumericLiteral');
        expect(result.value).toBe(12300);
      });

      it('should resolve hexadecimal numbers', () => {
        const { statements, program } = parseCode('0xFF');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('NumericLiteral');
        expect(result.value).toBe(255);
      });

      it('should resolve octal numbers', () => {
        const { statements, program } = parseCode('0o77');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('NumericLiteral');
        expect(result.value).toBe(63); // 0o77 = 63 in decimal
      });

      it('should resolve binary numbers', () => {
        const { statements, program } = parseCode('0b1010');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('NumericLiteral');
        expect(result.value).toBe(10); // 0b1010 = 10 in decimal
      });

      it('should resolve big integers', () => {
        const { statements, program } = parseCode('123n');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('BigIntLiteral');
        expect(result.value).toBe(123n);
      });
    });

    describe('Strings', () => {
      it('should resolve double-quoted strings', () => {
        const { statements, program } = parseCode('"hello"');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('StringLiteral');
        expect(result.value).toBe('hello');
      });

      it('should resolve single-quoted strings', () => {
        const { statements, program } = parseCode("'hello'");

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('StringLiteral');
        expect(result.value).toBe('hello');
      });

      it('should resolve template literals without substitutions', () => {
        const { statements, program } = parseCode('`hello`');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('StringLiteral');
        expect(result.value).toBe('hello');
      });

      it('should resolve strings with escape sequences', () => {
        const { statements, program } = parseCode(
          // eslint-disable-next-line no-useless-escape
          '"hello\\nworld\\t\\r\\v\\b\\f\\\'\\\"\\\\"',
        );

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('StringLiteral');
        // eslint-disable-next-line no-useless-escape
        expect(result.value).toBe('hello\nworld\t\r\v\b\f\'\"\\');
      });

      it('should resolve strings with unicode escape sequences', () => {
        const { statements, program } = parseCode('"\\u{1F600}\\u0041"');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('StringLiteral');
        expect(result.value).toBe('😀A');
      });

      it('should resolve strings with direct unicode characters', () => {
        const { statements, program } = parseCode('"😀A한글"');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('StringLiteral');
        expect(result.value).toBe('😀A한글');
      });

      it('should resolve strings with unicode surrogate pairs', () => {
        const { statements, program } = parseCode('"👨‍👩‍👧‍👦"');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('StringLiteral');
        expect(result.value).toBe('👨‍👩‍👧‍👦');
      });

      it('should resolve template literals with numeric expressions', () => {
        const { statements, program } = parseCode('`Value: ${123}`');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('StringLiteral');
        expect(result.value).toBe('Value: 123');
      });

      it('should resolve template literals with string expressions', () => {
        const { statements, program } = parseCode('`Hello ${"world"}`');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('StringLiteral');
        expect(result.value).toBe('Hello world');
      });

      it('should resolve template literals with multiple expressions', () => {
        const { statements, program } = parseCode('`${1} + ${2} = ${3}`');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('StringLiteral');
        expect(result.value).toBe('1 + 2 = 3');
      });
    });

    describe('Regular Expressions', () => {
      it('should resolve regex patterns', () => {
        const { statements, program } = parseCode('/hello/');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('RegularExpressionLiteral');
        expect(result.value).toBeInstanceOf(RegExp);
        expect((result.value as RegExp).source).toBe('hello');
      });
    });

    describe('Booleans', () => {
      it('should resolve true values', () => {
        const { statements, program } = parseCode('true');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('TrueKeyword');
        expect(result.value).toBe(true);
      });

      it('should resolve false values', () => {
        const { statements, program } = parseCode('false');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('FalseKeyword');
        expect(result.value).toBe(false);
      });
    });
  });

  describe('Complex Types', () => {
    describe('Arrays', () => {
      it('should resolve arrays with mixed primitive types', () => {
        const { statements, program } = parseCode('["hello", 123]');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('ArrayLiteralExpression');
        expect(result.value).toBeInstanceOf(Array);
        const array = result.value as ResolverResult[];
        expect(array.length).toBe(2);
        expect(array[0]).toBe('hello');
        expect(array[1]).toBe(123);
      });
    });

    describe('Objects', () => {
      it('should resolve simple object literals', () => {
        const { statements, program } = parseCode('({ hello: 123 })');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('ObjectLiteralExpression');
        expect(result.value).toEqual({ hello: 123 });
      });

      it('should resolve objects with computed property names', () => {
        const { statements, program } = parseCode(`
          const key = "hello";
          ({ [key]: 123 });
        `);

        expect(statements.length).toBe(2);
        const lastStatement = statements[1];
        expect(lastStatement.kind).toBe(ts.SyntaxKind.ExpressionStatement);
        const result = resolveToLiteral(
          (lastStatement as ts.ExpressionStatement).expression,
          program,
        );

        expect(result.valueType).toBe('ObjectLiteralExpression');
        expect(result.value).toEqual({ hello: 123 });
      });

      it('should resolve objects with quoted string keys', () => {
        const { statements, program } = parseCode('({ "hello": 123 })');

        const expression = getFirstExpression(statements);
        const result = resolveToLiteral(expression, program);

        expect(result.valueType).toBe('ObjectLiteralExpression');
        expect(result.value).toEqual({ hello: 123 });
      });

      it('should resolve objects in variable declarations', () => {
        const { statements, program } = parseCode(
          'const obj = { "hello": 123 }',
        );

        expect(statements.length).toBe(1);
        const statement = statements[0];
        expect(statement.kind).toBe(ts.SyntaxKind.VariableStatement);
        const declarationList = (statement as ts.VariableStatement)
          .declarationList;
        expect(declarationList.declarations.length).toBe(1);
        const declaration = declarationList.declarations[0];
        expect(declaration.kind).toBe(ts.SyntaxKind.VariableDeclaration);
        const initializer = declaration.initializer;
        expect(initializer).toBeDefined();
        expect(initializer!.kind).toBe(ts.SyntaxKind.ObjectLiteralExpression);
        const result = resolveToLiteral(initializer!, program);
        expect(result.valueType).toBe('ObjectLiteralExpression');
        expect(result.value).toEqual({ hello: 123 });
      });
    });
  });

  describe('Identifiers and References', () => {
    it('should resolve identifiers to their declared values', () => {
      const { statements, program } = parseCode(`
        const str = "hello";
        str;
      `);

      expect(statements.length).toBe(2);
      const lastStatement = statements[1];
      expect(lastStatement.kind).toBe(ts.SyntaxKind.ExpressionStatement);
      const result = resolveToLiteral(
        (lastStatement as ts.ExpressionStatement).expression,
        program,
      );

      expect(result.valueType).toBe('StringLiteral');
      expect(result.value).toBe('hello');
    });

    it('should resolve imported variables to their values', () => {
      const fixtureDir = path.join(__dirname, 'fixtures', 'two-files');
      const constantsPath = path.join(fixtureDir, 'constants.ts');
      const importsPath = path.join(fixtureDir, 'imports.ts');

      const program = ts.createProgram([constantsPath, importsPath], {
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        esModuleInterop: true,
        strict: true,
      });

      const sourceFile = program.getSourceFile(importsPath);
      expect(sourceFile).toBeDefined();

      const statements = sourceFile!.statements;
      expect(statements.length).toBe(5); // 1 import + 4 expressions

      // Test STRING_CONSTANT
      const stringStatement = statements[1];
      expect(stringStatement.kind).toBe(ts.SyntaxKind.ExpressionStatement);
      const stringResult = resolveToLiteral(
        (stringStatement as ts.ExpressionStatement).expression,
        program,
      );
      expect(stringResult.valueType).toBe('StringLiteral');
      expect(stringResult.value).toBe('hello world');

      // Test NUMBER_CONSTANT
      const numberStatement = statements[2];
      expect(numberStatement.kind).toBe(ts.SyntaxKind.ExpressionStatement);
      const numberResult = resolveToLiteral(
        (numberStatement as ts.ExpressionStatement).expression,
        program,
      );
      expect(numberResult.valueType).toBe('NumericLiteral');
      expect(numberResult.value).toBe(42);

      // Test ARRAY_CONSTANT
      const arrayStatement = statements[3];
      expect(arrayStatement.kind).toBe(ts.SyntaxKind.ExpressionStatement);
      const arrayResult = resolveToLiteral(
        (arrayStatement as ts.ExpressionStatement).expression,
        program,
      );
      expect(arrayResult.valueType).toBe('ArrayLiteralExpression');
      expect(arrayResult.value).toEqual(['a', 'b', 'c']);

      // Test OBJECT_CONSTANT
      const objectStatement = statements[4];
      expect(objectStatement.kind).toBe(ts.SyntaxKind.ExpressionStatement);
      const objectResult = resolveToLiteral(
        (objectStatement as ts.ExpressionStatement).expression,
        program,
      );
      expect(objectResult.valueType).toBe('ObjectLiteralExpression');
      expect(objectResult.value).toEqual({
        key1: 'value1',
        key2: 123,
      });
    });
  });
});
