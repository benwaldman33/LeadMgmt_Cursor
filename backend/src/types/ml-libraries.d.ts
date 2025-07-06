declare module 'ml-regression' {
  export class PolynomialRegression {
    constructor(x: number[][], y: number[], options?: { degree: number });
    predict(x: number[]): number;
  }
}

declare module 'ml-matrix' {
  export class Matrix {
    constructor(data: number[][] | number[]);
    static ones(rows: number, columns: number): Matrix;
    static zeros(rows: number, columns: number): Matrix;
  }
}

declare module 'compromise' {
  function compromise(text: string): any;
  export = compromise;
} 