export class CExecutionContext {
  private currentSymbol: number = 0;
  public currentCode: string = '';

  public getNewSymbol(): string {
    return `sym_${this.currentSymbol++}`;
  }

  public pushHeader(name: string, system: boolean = false) {
    this.currentCode += `#include ${system ? '<' : '"'}${name}${system ? '>' : '"'}\n`;
  }

  public beginFunction(name: string, returnType: string, parameters: string) {
    this.currentCode += `${returnType} ${name}(${parameters});\n`;
  }

  public endFunction() {
    this.currentCode += `}`;
  }

  public pushCode(code: string) {
    this.pushCodeRaw(code);
    this.pushCodeRaw('\n');
  }

  public pushCodeRaw(code: string) {
    this.currentCode += code + '\n';
  }
}
