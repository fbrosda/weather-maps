export type ReturnData = {
  data: object;
  type: string;
};

export abstract class DataFetcher {
  type2Method: Map<string, (param: object) => Promise<ReturnData>> = new Map();

  async fetch(param: object, type: string): Promise<ReturnData> {
    const func = this.type2Method.get(type);

    if (func) {
      return func.call(this, param);
    } else {
      throw new Error(`${this.constructor.name} has no method for "${type}"`);
    }
  }

  supportedTypes(): string[] {
    return Array.from(this.type2Method.keys());
  }

  isTypeSupported(type: string): boolean {
    return this.type2Method.has(type);
  }
}
