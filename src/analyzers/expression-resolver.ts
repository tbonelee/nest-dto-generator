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
export function resolveToLiteral(
  expr: ts.Node,
  program: ts.Program,
): ResolverResult {
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
    case ts.SyntaxKind.PrefixUnaryExpression:
      return resolvePrefixUnaryExpressionToLiteral(
        expr as ts.PrefixUnaryExpression,
        program,
      );
    case ts.SyntaxKind.ArrayLiteralExpression:
      return {
        valueType: 'ArrayLiteralExpression',
        value: (expr as ts.ArrayLiteralExpression).elements.map((element) =>
          resolveToLiteral(element, program),
        ),
      };
    case ts.SyntaxKind.ParenthesizedExpression:
      return resolveToLiteral(
        (expr as ts.ParenthesizedExpression).expression,
        program,
      );
    case ts.SyntaxKind.ComputedPropertyName:
      return resolveToLiteral(
        (expr as ts.ComputedPropertyName).expression,
        program,
      );
    case ts.SyntaxKind.ObjectLiteralExpression:
      return {
        valueType: 'ObjectLiteralExpression',
        value: (expr as ts.ObjectLiteralExpression).properties.reduce(
          (acc, prop) => {
            if (ts.isPropertyAssignment(prop)) {
              const key = resolveToLiteral(prop.name, program);
              const value = resolveToLiteral(prop.initializer, program);
              // @ts-expect-error: ObjectLiteralExpression.properties is not typed
              acc[key.value] = value.value;
            }
            return acc;
          },
          {} as Record<string, ResolverResult>,
        ),
      };
    case ts.SyntaxKind.Identifier: {
      const typeChecker = program.getTypeChecker();
      const symbol = typeChecker.getSymbolAtLocation(expr);
      if (symbol === undefined) {
        // treat the node as String Literal
        return {
          valueType: 'StringLiteral',
          // @ts-expect-error: Identifier.escapedText is not typed
          value: (expr as ts.Identifier).escapedText,
        };
      } else {
        return resolveSymbolToLiteral(symbol, program);
      }
    }
  }
  return { valueType: undefined, value: undefined };
}

function resolvePrefixUnaryExpressionToLiteral(
  expr: ts.PrefixUnaryExpression,
  program: ts.Program,
): ResolverResult {
  switch (expr.operator) {
    case ts.SyntaxKind.MinusToken: {
      const result = resolveToLiteral(expr.operand, program);
      if (result.valueType === 'NumericLiteral') {
        return {
          valueType: 'NumericLiteral',
          value: -result.value,
        };
      }
    }
  }
  return { valueType: undefined, value: undefined };
}

function resolveSymbolToLiteral(
  symbol: ts.Symbol,
  program: ts.Program,
): ResolverResult {
  const typeChecker = program.getTypeChecker();
  const type = typeChecker.getTypeOfSymbol(symbol);
  if (symbol.flags === ts.SymbolFlags.Property) {
    return {
      valueType: 'StringLiteral',
      value: symbol.escapedName as string,
    };
  }
  return resolveTypeToLiteral(type);
}

function resolveTypeToLiteral(typeObject: ts.Type): ResolverResult {
  switch (typeObject.flags) {
    case ts.TypeFlags.StringLiteral:
      return {
        valueType: 'StringLiteral',
        value: (typeObject as ts.StringLiteralType).value,
      };
    case ts.TypeFlags.Number:
  }

  return { valueType: undefined, value: undefined };
}
