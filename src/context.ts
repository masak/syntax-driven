import {
    Ast,
} from "./source";
import {
    Env,
} from "./env";
import {
    Instr,
    Register,
} from "./target";
import {
    Conf,
} from "./conf";

export class Context {
    instrs: Array<Instr> = [];
    unusedReg = 0;
    labelMap = new Map<string, number>();
    registerMap = new Map<string, Register>();
    topIndex = 0;

    constructor(
        public sourceName: string,
        public sourceParams: Ast,
        public env: Env,
        public conf: Conf,
    ) {
    }

    nextReg(): Register {
        return this.unusedReg++;
    }

    nextAvailableLabel(prefix: string) {
        let n = 1;
        while (true) {
            let label = `${prefix}-${n}`;
            if (!this.labelMap.has(label)) {
                return label;
            }
            n += 1;
        }
    }

    setTopIndex() {
        this.topIndex = this.instrs.length;
    }
}

