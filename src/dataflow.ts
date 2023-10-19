import {
    Instr,
    InstrArgOne,
    InstrSetApply,
    InstrStackPush,
    isSetInstr,
    Register,
} from "./target";

export class Dataflow {
    constructor(public dataflow: Map<Register, Set<Register>>) {
    }

    straddling(maxReqReg: Register, limit: Register) {
        return [...this.dataflow.keys()]
            .filter((sourceReg) =>
                sourceReg > maxReqReg &&
                sourceReg < limit &&
                [...this.dataflow.get(sourceReg)!].some((targetReg) =>
                    targetReg > limit
                ));
    }
}

export function computeDataflow(instrs: Array<Instr>): Dataflow {
    let dataflow = new Map<Register, Set<Register>>();

    function addDataFlow(sourceReg: Register, targetReg: Register): void {
        if (!dataflow.has(sourceReg)) {
            dataflow.set(sourceReg, new Set());
        }
        dataflow.get(sourceReg)!.add(targetReg);
    }

    for (let instr of instrs) {
        if (isSetInstr(instr)) {
            let targetReg = instr.targetReg;
            instr.forEachInReg((register) => {
                addDataFlow(register, targetReg);
            });
        }
        else if (instr instanceof InstrArgOne) {
            addDataFlow(instr.register, -2 as Register);
        }
        else if (instr instanceof InstrStackPush) {
            addDataFlow(instr.valueReg, instr.stackReg);
        }

        if (instr instanceof InstrSetApply) {
            let targetReg = instr.targetReg;
            for (let [source, targets] of dataflow.entries()) {
                dataflow.set(
                    source,
                    new Set([...targets].map((target) =>
                        target === -2 ? targetReg : target
                    )),
                );
            }
        }
    }

    return new Dataflow(dataflow);
}

