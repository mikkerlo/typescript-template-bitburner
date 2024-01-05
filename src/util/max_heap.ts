export class MaxHeap<T> {
    private heap: T[] = [];
    private compare: (a: T, b: T) => number;
    private _length = 0;
  
    constructor(compare: (a: T, b: T) => number) {
        this.compare = compare;
    }

    get length(): number {
        return this._length;
    }

    get size(): number {
        return this._length;
    }
  
    insert(element: T): void {
        this._length += 1;
        this.heap.push(element);
        let index = this.heap.length - 1;
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.compare(this.heap[parentIndex], this.heap[index]) >= 0) break;

            [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
            index = parentIndex;
        }
    }
  
    removeMax(): T | null {
        if (this.heap.length === 0) return null;

        this._length -= 1

        const max = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0 && end !== undefined) {
            this.heap[0] = end;
            this.sinkDown(0);
        }
        return max;
    }
      
  
    private sinkDown(index: number): void {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let largest = index;
      const length = this.heap.length;
  
      if (left < length && this.compare(this.heap[left], this.heap[largest]) > 0) {
        largest = left;
      }
      if (right < length && this.compare(this.heap[right], this.heap[largest]) > 0) {
        largest = right;
      }
      if (largest !== index) {
        [this.heap[index], this.heap[largest]] = [this.heap[largest], this.heap[index]];
        this.sinkDown(largest);
      }
    }
  }
