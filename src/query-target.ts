import {
    Instr,
    Target,
} from "./target";

class Query {
    constructor(public instrs: Array<Instr>) {
    }

    count(callback: (instr: Instr) => boolean): number {
        return this.instrs.filter(callback).length;
    }

    filter(callback: (instr: Instr) => boolean): Query {
        return new Query(this.instrs.filter(callback));
    }

    accumSet<T>(callback: (instr: Instr) => T): Set<T> {
        let result = new Set<T>();
        for (let instr of this.instrs) {
            result.add(callback(instr));
        }
        return result;
    }

    accumOne<T>(callback: (instr: Instr) => T): T {
        let length = this.instrs.length;
        if (length !== 1) {
            throw new Error(`Expected exactly one instr, was ${length}`);
        }
        return callback(this.instrs[0]);
    }
}

export function query(target: Target): Query {
    return new Query(target.body);
}

