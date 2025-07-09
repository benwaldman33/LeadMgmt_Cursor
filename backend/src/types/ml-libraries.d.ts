declare module 'ml-regression' {
  export class PolynomialRegression {
    constructor(x: number[], y: number[], degree?: number);
    predict(x: number): number;
    coefficients: number[];
    r2: number;
  }
}

declare module 'ml-matrix' {
  export class Matrix {
    constructor(data: number[][] | number[]);
    static ones(rows: number, cols: number): Matrix;
    static zeros(rows: number, cols: number): Matrix;
    get(row: number, col: number): number;
    set(row: number, col: number, value: number): void;
    to2DArray(): number[][];
  }
} 