import {
    Instr,
    Target,
} from "./target";

export class TargetWriter {
    instrs: Array<Instr> = [];
    labels = new Map<string, number>();

    constructor(public funcName: string, public reqCount: number) {
    }

    addInstr(instr: Instr): void {
        this.instrs.push(instr);
    }

    instrCount(): number {
        return this.instrs.length;
    }

    addLabel(label: string): void {
        this.labels.set(label, this.instrCount());
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

