export class SerializableBigInt {
  public value: bigint;

  constructor(value: bigint | number | string) {
    if (typeof value === 'bigint') {
      this.value = value;
    } else {
      this.value = BigInt(value);
    }
  }

  toJSON() {
    return this.value.toString();
  }
}
