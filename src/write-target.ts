import {
    Ast,
    AstList,
    AstSymbol,
} from "./source";
import {
    Instr,
    isSetInstr,
    Register,
    SetInstr,
    Target,
} from "./target";
import {
    Env,
} from "./env";
import {
    Conf,
} from "./conf";

export class TargetWriter {
    instrs: Array<Instr> = [];
    labels = new Map<string, number>();
    unusedReg = 0;
    registerMap = new Map<string, Register>();
    topIndex = 0;
    reqCount: number;

    constructor(
        public sourceName: string,
        public sourceParams: Ast,
        public env: Env,
        public conf: Conf,
    ) {
        let maxReqReg = -1;

        // param handling
        if (sourceParams instanceof AstList) {
            for (let param of sourceParams.elems) {
                if (!(param instanceof AstSymbol)) {
                    throw new Error("non-symbol parameter -- todo");
                }
                let paramReg = this.unusedReg++;
                this.registerMap.set(param.name, paramReg);
                maxReqReg = paramReg;
            }
        }
        else if (sourceParams instanceof AstSymbol) {
            throw new Error("rest parameter -- todo");
        }

        this.reqCount = maxReqReg + 1;
    }

    addInstr(instr: Instr): void {
        this.instrs.push(instr);
    }

    instrCount(): number {
        return this.instrs.length;
    }

    ifLastInstrIsSetInstr(fn: (instr: SetInstr) => void): void {
        let lastInstr = this.instrs[this.instrs.length - 1];
        if (lastInstr === undefined) {
            throw new Error("Precondition failed: last instr doesn't exist");
        }
        if (isSetInstr(lastInstr)) {
            fn(lastInstr);
        }
    }

    addLabel(label: string, ip = this.instrCount()): void {
        this.labels.set(label, ip);
    }

    nextAvailableLabel(prefix: string) {
        let n = 1;
        while (true) {
            let label = `${prefix}-${n}`;
            if (!this.labels.has(label)) {
                return label;
            }
            n += 1;
        }
    }

    nextReg(): Register {
        return this.unusedReg++;
    }

    setTopIndex() {
        this.topIndex = this.instrs.length;
    }

    target(): Target {
        let regCount = -1;
        for (let instr of this.instrs) {
            instr.forEachOutReg((register) => {
                regCount = register + 1 > regCount
                    ? register + 1
                    : regCount;
            });
        }

        return new Target(
            this.sourceName,
            { reqCount: this.reqCount, regCount },
            this.instrs,
            this.labels,
        );
    }
}

