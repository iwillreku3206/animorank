import { StringType } from '../../../types/string';
import { TypeValue } from '../../../typeValue.svelte';
import { CType } from '../cType';
import type { CExecutionContext } from '../executionContext';

function escapeCLiteral(value: string): string {
  let out = '"';
  for (const ch of value) {
    switch (ch) {
      case '\\':
        out += '\\\\';
        break;
      case '"':
        out += '\\"';
        break;
      case '\n':
        out += '\\n';
        break;
      case '\r':
        out += '\\r';
        break;
      case '\t':
        out += '\\t';
        break;
      case '\x07':
        out += '\\a';
        break;
      case '\b':
        out += '\\b';
        break;
      case '\f':
        out += '\\f';
        break;
      case '\v':
        out += '\\v';
        break;
      default: {
        const cp = ch.codePointAt(0)!;
        if (cp < 0x20 || cp === 0x7f) out += '\\' + cp.toString(8).padStart(3, '0');
        else out += ch;
      }
    }
  }
  return out + '"';
}

export class CStringType extends CType<StringType> {
  public readFromPrint(printed: string): TypeValue<StringType> {
    return new TypeValue(this.type, { value: printed });
  }
  static type = StringType;

  public generateParameterDefinition(symbol: string): string {
    return `char* ${symbol}`;
  }

  public generateReturnType(): string {
    return 'char*';
  }

  public pushDeclaration(context: CExecutionContext, symbol: string, value?: TypeValue<StringType>): void {
    context.pushCode(`char* ${symbol};`);
    if (value) {
      context.pushCode(`${symbol} = ${escapeCLiteral(value.value.value)};`);
    }
  }

  public pushPreDefinitions(context: CExecutionContext): void {
    context.pushHeader('stdio.h');
  }

  public pushPrint(context: CExecutionContext, symbol: string, fileSymbol: string): void {
    context.pushCode(`fprintf(${fileSymbol}, "%s", ${symbol});`);
  }
}
