import {
    Instr,
    InstrArgOne,
    InstrSetApply,
    InstrSetIsStackEmpty,
    InstrSetPrimCarReg,
    InstrSetPrimCdrReg,
    InstrSetPrimIdRegSym,
    InstrSetPrimTypeReg,
    InstrSetReg,
    InstrSetStackPop,
    InstrStackPush,
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
        if (instr instanceof InstrSetPrimCarReg) {
            addDataFlow(instr.objectReg, instr.targetReg);
        }
        else if (instr instanceof InstrSetPrimCdrReg) {
            addDataFlow(instr.objectReg, instr.targetReg);
        }
        else if (instr instanceof InstrSetPrimIdRegSym) {
            addDataFlow(instr.leftReg, instr.targetReg);
        }
        else if (instr instanceof InstrSetPrimTypeReg) {
            addDataFlow(instr.objectReg, instr.targetReg);
        }
        else if (instr instanceof InstrSetReg) {
            addDataFlow(instr.sourceReg, instr.targetReg);
        }
        else if (instr instanceof InstrArgOne) {
            addDataFlow(instr.register, -2 as Register);
        }
        else if (instr instanceof InstrSetApply) {
            let targetReg = instr.targetReg;
            for (let [source, targets] of dataflow.entries()) {
                dataflow.set(
                    source,
                    new Set([...targets].map((target) =>
                        target === -2 ? targetReg : target
                    )),
                );
            }
            addDataFlow(instr.funcReg, targetReg);
        }
        else if (instr instanceof InstrStackPush) {
            addDataFlow(instr.valueReg, instr.stackReg);
        }
        else if (instr instanceof InstrSetIsStackEmpty) {
            addDataFlow(instr.stackReg, instr.targetReg);
        }
        else if (instr instanceof InstrSetStackPop) {
            addDataFlow(instr.stackReg, instr.targetReg);
        }
        // non-exhaustive list of instruction types
    }

    return new Dataflow(dataflow);
}

