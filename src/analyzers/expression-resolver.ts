import ts from 'typescript';

export type ResolverResult =
  | {
      valueType: 'NumericLiteral';
      value: number;
    }
  | {
      valueType: 'BigIntLiteral';
      value: bigint;
    }
  | {
      valueType: 'StringLiteral';
      value: string;
    }
  | {
      valueType: 'RegularExpressionLiteral';
      value: RegExp;
    }
  | {
      valueType: 'TrueKeyword';
      value: true;
    }
  | {
      valueType: 'FalseKeyword';
      value: false;
    }
  | {
      valueType: 'ArrayLiteralExpression';
      value: ResolverResult[];
    }
  | {
      valueType: 'ObjectLiteralExpression';
      value: Record<string, ResolverResult>;
    }
  | {
      valueType: undefined;
      value: undefined;
    };

/**
 * Converts an AST Node to a literal value.
 * If conversion is not possible, valueType = undefined.
 *
 * @param expr: ts.Node
 * @returns ResolverResult
 */
export function resolveToLiteral(expr: ts.Node): ResolverResult {
  switch (expr.kind) {
    case ts.SyntaxKind.NumericLiteral:
      return {
        valueType: 'NumericLiteral',
        value: parseFloat((expr as ts.NumericLiteral).text),
      };
    case ts.SyntaxKind.BigIntLiteral:
      return {
        valueType: 'BigIntLiteral',
        // Remove the 'n' suffix from the literal
        value: BigInt((expr as ts.BigIntLiteral).text.slice(0, -1)),
      };
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
      return {
        valueType: 'StringLiteral',
        value: (expr as ts.StringLiteral).text,
      };
    case ts.SyntaxKind.RegularExpressionLiteral:
      return {
        valueType: 'RegularExpressionLiteral',
        // remove the slashes at the beginning and end of the literal
        value: new RegExp(
          (expr as ts.RegularExpressionLiteral).text.slice(1, -1),
        ),
      };
    case ts.SyntaxKind.TrueKeyword:
      return {
        valueType: 'TrueKeyword',
        value: true,
      };
    case ts.SyntaxKind.FalseKeyword:
      return {
        valueType: 'FalseKeyword',
        value: false,
      };
    case ts.SyntaxKind.ArrayLiteralExpression:
      return {
        valueType: 'ArrayLiteralExpression',
        value: (expr as ts.ArrayLiteralExpression).elements.map(
          resolveToLiteral,
        ),
      };
    case ts.SyntaxKind.ObjectLiteralExpression:
      return {
        valueType: 'ObjectLiteralExpression',
        value: (expr as ts.ObjectLiteralExpression).properties.reduce(
          (acc, prop) => {
            console.log(ts.SyntaxKind[prop.kind]);
            if (ts.isPropertyAssignment(prop)) {
              if (ts.isStringLiteral(prop.name)) {
                acc[prop.name.text] = resolveToLiteral(prop.initializer);
              } else if (ts.isIdentifier(prop.name)) {
                // TODO: Implement this
                throw new Error('Not implemented');
              }
            }
            return acc;
          },
          {} as Record<string, ResolverResult>,
        ),
      };
  }
  return { valueType: undefined, value: undefined };
}
