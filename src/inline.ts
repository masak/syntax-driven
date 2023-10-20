import {
    cloneInstr,
    InstrReturnReg,
    Register,
    Target,
} from "./target";
import {
    TargetWriter,
} from "./write-target";

export function inline(
    callee: Target,
    argRegs: Array<Register>,
    writer: TargetWriter,
    unusedReg: Register,
) {
    let registerMap: Map<Register, Register> = new Map();
    for (let i = 0; i < callee.header.reqCount; i++) {
        registerMap.set(i, argRegs[i]);
    }

    // XXX: The assumption that target registers are never re-used was just
    //      broken as of the `if` compiler logic. A rethink around the
    //      below logic is required, as soon as `some` gets inlined somewhere
    //      (which we know will happen with `map`).

    for (let instr of callee.body) {
        if (instr instanceof InstrReturnReg) {
            return registerMap.get(instr.returnReg)!;
        }
        else {
            writer.addInstr(
                cloneInstr(instr)
                    .forEachOutReg((targetReg) => {
                        registerMap.set(targetReg, unusedReg++);
                    })
                    .changeAllRegs((reg) => registerMap.get(reg)!)
            );
        }
    }

    throw new Error(`Malformed bytecode '${callee.name}': fell off the end`);
}

