import {
    Instr,
    isSetInstr,
    Register,
    SetInstr,
    Target,
} from "./target";

export class TargetWriter {
    instrs: Array<Instr> = [];
    labels = new Map<string, number>();
    unusedReg = 0;

    constructor(public funcName: string, public reqCount: number) {
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
            this.funcName,
            { reqCount: this.reqCount, regCount },
            this.instrs,
            this.labels,
        );
    }
}

