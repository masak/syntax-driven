import {
    Instr,
    Target,
} from "./target";

class Query {
    constructor(public instrsIps: Array<[Instr, number]>) {
    }

    count(callback: (instr: Instr, ip: number) => boolean): number {
        return this.instrsIps
            .filter(([instr, ip]) => callback(instr, ip))
            .length;
    }

    filter(callback: (instr: Instr) => boolean): Query {
        return new Query(
            this.instrsIps.filter(([instr, _]) => callback(instr))
        );
    }

    accumSet<T>(callback: (instr: Instr) => T): Set<T> {
        let result = new Set<T>();
        for (let [instr, _] of this.instrsIps) {
            result.add(callback(instr));
        }
        return result;
    }

    accumArray<T>(callback: (instr: Instr) => T): Array<T> {
        let result: Array<T> = [];
        for (let [instr, _] of this.instrsIps) {
            result.push(callback(instr));
        }
        return result;
    }

    accumOne<T>(callback: (instr: Instr) => T): T {
        let length = this.instrsIps.length;
        if (length !== 1) {
            throw new Error(`Expected exactly one instr, was ${length}`);
        }
        return callback(this.instrsIps[0][0]);
    }
}

export function query(target: Target): Query {
    return new Query(target.body.map((instr, ip) => [instr, ip]));
}

