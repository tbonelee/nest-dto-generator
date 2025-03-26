import {
  ResolverResult,
  resolveToLiteral,
} from '../../src/analyzers/expression-resolver';
import ts from 'typescript';

describe('resolveToLiteral', () => {
  const factory = ts.factory;
  it('should resolve numeric literal correctly', () => {
    const numericLiteral = factory.createNumericLiteral('123');
    const result = resolveToLiteral(numericLiteral);

    expect(result.valueType).toBe('NumericLiteral');
    expect(result.value).toBe(123);
  });

  it('should resolve big int literal correctly', () => {
    const bigIntLiteral = factory.createBigIntLiteral('123n');
    const result = resolveToLiteral(bigIntLiteral);

    expect(result.valueType).toBe('BigIntLiteral');
    expect(result.value).toBe(123n);
  });

  it('should resolve string literal correctly', () => {
    const stringLiteral = factory.createStringLiteral('hello');
    const result = resolveToLiteral(stringLiteral);

    expect(result.valueType).toBe('StringLiteral');
    expect(result.value).toBe('hello');
  });

  it('should resolve template literal with no substitution correctly', () => {
    const templateLiteral =
      factory.createNoSubstitutionTemplateLiteral('hello');
    const result = resolveToLiteral(templateLiteral);

    expect(result.valueType).toBe('StringLiteral');
    expect(result.value).toBe('hello');
  });

  it('should resolve regular expression literal correctly', () => {
    const factory = ts.factory;
    const regexLiteral = factory.createRegularExpressionLiteral('/hello/');
    const result = resolveToLiteral(regexLiteral);

    expect(result.valueType).toBe('RegularExpressionLiteral');
    expect(result.value).toBeInstanceOf(RegExp);
    expect((result.value as RegExp).source).toBe('hello');
  });

  it('should resolve true keyword correctly', () => {
    const trueKeyword = factory.createTrue();
    const result = resolveToLiteral(trueKeyword);

    expect(result.valueType).toBe('TrueKeyword');
    expect(result.value).toBe(true);
  });

  it('should resolve false keyword correctly', () => {
    const falseKeyword = factory.createFalse();
    const result = resolveToLiteral(falseKeyword);

    expect(result.valueType).toBe('FalseKeyword');
    expect(result.value).toBe(false);
  });

  it('should resolve array literal correctly', () => {
    const factory = ts.factory;
    const arrayLiteral = factory.createArrayLiteralExpression([
      factory.createStringLiteral('hello'),
      factory.createNumericLiteral('123'),
    ]);
    const result = resolveToLiteral(arrayLiteral);

    expect(result.valueType).toBe('ArrayLiteralExpression');
    expect(result.value).toBeInstanceOf(Array);
    const array = result.value as ResolverResult[];
    expect(array.length).toBe(2);
    expect(array[0].valueType).toBe('StringLiteral');
    expect(array[0].value).toBe('hello');
    expect(array[1].valueType).toBe('NumericLiteral');
    expect(array[1].value).toBe(123);
  });

  it('should resolve object literal correctly', () => {
    const factory = ts.factory;
    const objectLiteral = factory.createObjectLiteralExpression([
      factory.createPropertyAssignment(
        factory.createStringLiteral('hello'),
        factory.createNumericLiteral('123'),
      ),
    ]);
    const result = resolveToLiteral(objectLiteral);

    expect(result.valueType).toBe('ObjectLiteralExpression');
    expect(result.value).toBeInstanceOf(Object);
    const object = result.value as Record<string, ResolverResult>;
    expect(object.hello.valueType).toBe('NumericLiteral');
    expect(object.hello.value).toBe(123);
  });
});
