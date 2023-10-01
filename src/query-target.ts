import {
    Instr,
    Target,
} from "./target";

class Query {
    constructor(public target: Target) {
    }

    count(callback: (instr: Instr) => boolean): number {
        return this.target.body.filter(callback).length;
    }
}

export function query(target: Target): Query {
    return new Query(target);
}

