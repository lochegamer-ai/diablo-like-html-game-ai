
export class RNG{constructor(seed=Date.now()%2147483647){this.seed=seed}
  next(){return this.seed=this.seed*48271%2147483647}
  nextFloat(){return (this.next()-1)/2147483646}}
