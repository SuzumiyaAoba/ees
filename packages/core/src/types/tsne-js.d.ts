declare module "tsne-js" {
  export interface TSNEOptions {
    dim?: number
    perplexity?: number
    earlyExaggeration?: number
    learningRate?: number
    nIter?: number
    metric?: string
  }

  export interface TSNEInputData {
    data: number[][]
    type: "dense" | "sparse"
  }

  export default class TSNE {
    constructor(options?: TSNEOptions)
    init(inputData: TSNEInputData): void
    run(): void
    getOutput(): number[][]
  }
}
