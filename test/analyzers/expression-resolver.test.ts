import {
  ResolverResult,
  resolveToLiteral,
} from '../../src/analyzers/expression-resolver';
import ts from 'typescript';
import { expect } from '@jest/globals';

describe('resolveToLiteral', () => {
  const parseCode = (
    code: string,
  ): {
    statements: ts.NodeArray<ts.Statement>;
    program: ts.Program;
  } => {
    const sourceFile = ts.createSourceFile(
      'test.ts',
      code,
      ts.ScriptTarget.Latest,
      true,
    );
    return {
      statements: sourceFile.statements,
      program: ts.createProgram({
        rootNames: [sourceFile.fileName],
        options: { target: ts.ScriptTarget.Latest },
      }),
    };
  };

  const getFirstExpression = (stmts: ts.NodeArray<ts.Statement>): ts.Node => {
    expect(stmts.length).toBeGreaterThanOrEqual(1);
    expect(stmts[0].kind).toBe(ts.SyntaxKind.ExpressionStatement);

    return (stmts[0] as ts.ExpressionStatement).expression;
  };

  describe('numeric literal', () => {
    it('should resolve numeric literal correctly', () => {
      const { statements, program } = parseCode('123');

      const expression = getFirstExpression(statements);
      const result = resolveToLiteral(expression, program);

      expect(result.valueType).toBe('NumericLiteral');
      expect(result.value).toBe(123);
    });
  });

  describe('big int literal', () => {
    it('should resolve big int literal correctly', () => {
      const { statements, program } = parseCode('123n');

      const expression = getFirstExpression(statements);
      const result = resolveToLiteral(expression, program);

      expect(result.valueType).toBe('BigIntLiteral');
      expect(result.value).toBe(123n);
    });
  });

  describe('string literal', () => {
    it('should resolve double quoted string literal correctly', () => {
      const { statements, program } = parseCode('"hello"');

      const expression = getFirstExpression(statements);
      const result = resolveToLiteral(expression, program);

      expect(result.valueType).toBe('StringLiteral');
      expect(result.value).toBe('hello');
    });

    it('should resolve single quoted string literal correctly', () => {
      const { statements, program } = parseCode("'hello'");

      const expression = getFirstExpression(statements);
      const result = resolveToLiteral(expression, program);

      expect(result.valueType).toBe('StringLiteral');
      expect(result.value).toBe('hello');
    });

    it('should resolve template literal with no substitution correctly', () => {
      const { statements, program } = parseCode('`hello`');

      const expression = getFirstExpression(statements);
      const result = resolveToLiteral(expression, program);

      expect(result.valueType).toBe('StringLiteral');
      expect(result.value).toBe('hello');
    });
  });

  describe('template literal', () => {
    it('should resolve template literal with no substitution correctly', () => {
      const { statements, program } = parseCode('`hello`');

      const expression = getFirstExpression(statements);
      const result = resolveToLiteral(expression, program);

      expect(result.valueType).toBe('StringLiteral');
      expect(result.value).toBe('hello');
    });
  });

  describe('regular expression literal', () => {
    it('should resolve regular expression literal correctly', () => {
      const { statements, program } = parseCode('/hello/');

      const expression = getFirstExpression(statements);
      const result = resolveToLiteral(expression, program);

      expect(result.valueType).toBe('RegularExpressionLiteral');
      expect(result.value).toBeInstanceOf(RegExp);
      expect((result.value as RegExp).source).toBe('hello');
    });
  });

  describe('true keyword', () => {
    it('should resolve true keyword correctly', () => {
      const { statements, program } = parseCode('true');

      const expression = getFirstExpression(statements);
      const result = resolveToLiteral(expression, program);

      expect(result.valueType).toBe('TrueKeyword');
      expect(result.value).toBe(true);
    });
  });

  describe('false keyword', () => {
    it('should resolve false keyword correctly', () => {
      const { statements, program } = parseCode('false');

      const expression = getFirstExpression(statements);
      const result = resolveToLiteral(expression, program);

      expect(result.valueType).toBe('FalseKeyword');
      expect(result.value).toBe(false);
    });
  });

  describe('array literal', () => {
    it('should resolve array literal correctly', () => {
      const { statements, program } = parseCode('["hello", 123]');

      const expression = getFirstExpression(statements);
      const result = resolveToLiteral(expression, program);

      expect(result.valueType).toBe('ArrayLiteralExpression');
      expect(result.value).toBeInstanceOf(Array);
      const array = result.value as ResolverResult[];
      expect(array.length).toBe(2);
      expect(array[0].valueType).toBe('StringLiteral');
      expect(array[0].value).toBe('hello');
      expect(array[1].valueType).toBe('NumericLiteral');
      expect(array[1].value).toBe(123);
    });
  });

  describe('object literal', () => {
    it('should resolve parenthesized object literal correctly', () => {
      const { statements, program } = parseCode('({ hello: 123 })');

      const expression = getFirstExpression(statements);
      const result = resolveToLiteral(expression, program);

      expect(result.valueType).toBe('ObjectLiteralExpression');
      expect(result.value).toEqual({ hello: 123 });
    });

    it('should correctly resolve a parenthesized object literal with a quoted string literal key', () => {
      const { statements, program } = parseCode('({ "hello": 123 })');

      const expression = getFirstExpression(statements);
      const result = resolveToLiteral(expression, program);

      expect(result.valueType).toBe('ObjectLiteralExpression');
      expect(result.value).toEqual({ hello: 123 });
    });

    it('should correctly resolve a non-parenthesized object literal with a quoted string literal key', () => {
      const { statements, program } = parseCode('const obj = { "hello": 123 }');

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
