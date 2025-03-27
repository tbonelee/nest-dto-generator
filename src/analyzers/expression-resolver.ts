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
      value: unknown[];
    }
  | {
      valueType: 'ObjectLiteralExpression';
      value: Record<string, unknown>;
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
    case ts.SyntaxKind.TemplateExpression:
      return resolveTemplateExpressionToLiteral(
        expr as ts.TemplateExpression,
        program,
      );
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
        value: (expr as ts.ArrayLiteralExpression).elements
          .map((element) => resolveToLiteral(element, program))
          .map((res) => res.value),
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
    case ts.SyntaxKind.VariableDeclaration: {
      const initializer = (expr as ts.VariableDeclaration).initializer;
      if (initializer) {
        return resolveToLiteral(initializer, program);
      }
      break;
    }
    case ts.SyntaxKind.AsExpression:
      return resolveToLiteral((expr as ts.AsExpression).expression, program);
    case ts.SyntaxKind.ObjectLiteralExpression:
      return {
        valueType: 'ObjectLiteralExpression',
        value: (expr as ts.ObjectLiteralExpression).properties.reduce(
          (acc, prop) => {
            if (ts.isPropertyAssignment(prop)) {
              const key = resolveToLiteral(prop.name, program);
              const value = resolveToLiteral(prop.initializer, program);
              acc[key.value as string] = value.value;
            }
            return acc;
          },
          {} as Record<string, unknown>,
        ),
      };
    case ts.SyntaxKind.Identifier: {
      const typeChecker = program.getTypeChecker();
      let symbol = typeChecker.getSymbolAtLocation(expr);
      if (symbol && symbol.flags === ts.SymbolFlags.Alias) {
        symbol = typeChecker.getAliasedSymbol(symbol);
      }
      if (symbol === undefined) {
        // treat the node as String Literal
        return {
          valueType: 'StringLiteral',
          // @ts-expect-error: Identifier.escapedText is not typed
          value: (expr as ts.Identifier).escapedText,
        };
      }

      return resolveSymbolToLiteral(symbol, program);
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
  switch (symbol.flags) {
    case ts.SymbolFlags.Property:
      return {
        valueType: 'StringLiteral',
        value: symbol.escapedName as string,
      };
    case ts.SymbolFlags.ObjectLiteral: {
      if (symbol.valueDeclaration) {
        return resolveToLiteral(symbol.valueDeclaration, program);
      }
      break;
    }
    case ts.SymbolFlags.BlockScopedVariable: {
      if (symbol.valueDeclaration) {
        return resolveToLiteral(symbol.valueDeclaration, program);
      }
    }
  }
  const type = typeChecker.getTypeOfSymbol(symbol);
  return resolveTypeToLiteral(type, program);
}

function resolveTypeToLiteral(
  typeObject: ts.Type,
  program: ts.Program,
): ResolverResult {
  switch (typeObject.flags) {
    case ts.TypeFlags.StringLiteral:
      return {
        valueType: 'StringLiteral',
        value: (typeObject as ts.StringLiteralType).value,
      };
    case ts.TypeFlags.NumberLiteral:
      return {
        valueType: 'NumericLiteral',
        value: (typeObject as ts.NumberLiteralType).value,
      };
    case ts.TypeFlags.Object: {
      return resolveObjectTypeToLiteral(typeObject as ts.ObjectType, program);
    }
  }

  return { valueType: undefined, value: undefined };
}

function resolveObjectTypeToLiteral(
  typeObject: ts.ObjectType,
  program: ts.Program,
): ResolverResult {
  switch (typeObject.objectFlags) {
    case ts.ObjectFlags.Reference:
      return resolveTypeReferenceToLiteral(
        typeObject as ts.TypeReference,
        program,
      );
  }
  const symbol = typeObject.symbol;
  if (symbol) {
    return resolveSymbolToLiteral(symbol, program);
  }
  return { valueType: undefined, value: undefined };
}

function resolveTypeReferenceToLiteral(
  typeObject: ts.TypeReference,
  program: ts.Program,
): ResolverResult {
  const typeChecker = program.getTypeChecker();
  const typeArguments = typeChecker.getTypeArguments(typeObject);
  return {
    valueType: 'ArrayLiteralExpression',
    value: typeArguments
      .map((arg) => resolveTypeToLiteral(arg, program))
      .map((res) => res.value),
  };
}

function resolveTemplateExpressionToLiteral(
  expr: ts.TemplateExpression,
  program: ts.Program,
): ResolverResult {
  const templateSpans = expr.templateSpans;
  const mappedSpans = templateSpans.map((span) =>
    mapTemplateSpan(span, program),
  );
  if (mappedSpans.every((span) => span.canBeResolved)) {
    return {
      valueType: 'StringLiteral',
      value:
        expr.head.text + mappedSpans.map((span) => span.stringLiteral).join(''),
    };
  }
  return { valueType: undefined, value: undefined };
}

function mapTemplateSpan(
  node: ts.TemplateSpan,
  program: ts.Program,
): {
  canBeResolved: boolean;
  stringLiteral: string;
} {
  const expression = node.expression;
  const literal = node.literal;
  const exprResult = resolveToLiteral(expression, program);
  switch (exprResult.valueType) {
    case 'StringLiteral':
      return {
        canBeResolved: true,
        stringLiteral: exprResult.value + literal.text,
      };
    case 'NumericLiteral':
      return {
        canBeResolved: true,
        stringLiteral: exprResult.value.toString() + literal.text,
      };
    case 'BigIntLiteral':
      return {
        canBeResolved: true,
        stringLiteral: exprResult.value.toString() + literal.text,
      };
    case 'TrueKeyword':
      return {
        canBeResolved: true,
        stringLiteral: 'true' + literal.text,
      };
    case 'FalseKeyword':
      return {
        canBeResolved: true,
        stringLiteral: 'false' + literal.text,
      };
    default:
      return {
        canBeResolved: false,
        stringLiteral: '',
      };
  }
}
