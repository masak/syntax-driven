import {
    Instr,
    InstrArgOne,
    InstrArgsEnd,
    InstrArgsStart,
    InstrJmp,
    InstrJmpUnlessReg,
    InstrSetApply,
    InstrSetGetGlobal,
    InstrSetGetSymbol,
    InstrSetPrimCarReg,
    InstrSetPrimCdrReg,
    InstrSetPrimIdRegSym,
    InstrSetPrimTypeReg,
    InstrSetReg,
    InstrReturnReg,
    Register,
    Target,
} from "./target";

export function inline(
    callee: Target,
    argRegs: Array<Register>,
    instrs: Array<Instr>,
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

    let calleeInstrs = callee.body;
    for (let instr of calleeInstrs) {
        if (instr instanceof InstrSetPrimIdRegSym) {
            registerMap.set(instr.targetReg, unusedReg++);
            instrs.push(new InstrSetPrimIdRegSym(
                registerMap.get(instr.targetReg)!,
                registerMap.get(instr.leftReg)!,
                instr.rightSym,
            ));
        }
        else if (instr instanceof InstrReturnReg) {
            return registerMap.get(instr.returnReg)!;
        }
        else if (instr instanceof InstrSetGetGlobal) {
            registerMap.set(instr.targetReg, unusedReg++);
            instrs.push(new InstrSetGetGlobal(
                registerMap.get(instr.targetReg)!,
                instr.name,
            ));
        }
        else if (instr instanceof InstrSetGetSymbol) {
            registerMap.set(instr.targetReg, unusedReg++);
            instrs.push(new InstrSetGetSymbol(
                registerMap.get(instr.targetReg)!,
                instr.name,
            ));
        }
        else if (instr instanceof InstrSetPrimTypeReg) {
            registerMap.set(instr.targetReg, unusedReg++);
            instrs.push(new InstrSetPrimTypeReg(
                registerMap.get(instr.targetReg)!,
                registerMap.get(instr.objectReg)!,
            ));
        }
        else if (instr instanceof InstrSetPrimCarReg) {
            registerMap.set(instr.targetReg, unusedReg++);
            instrs.push(new InstrSetPrimCarReg(
                registerMap.get(instr.targetReg)!,
                registerMap.get(instr.objectReg)!,
            ));
        }
        else if (instr instanceof InstrSetPrimCdrReg) {
            registerMap.set(instr.targetReg, unusedReg++);
            instrs.push(new InstrSetPrimCdrReg(
                registerMap.get(instr.targetReg)!,
                registerMap.get(instr.objectReg)!,
            ));
        }
        else if (instr instanceof InstrSetReg) {
            registerMap.set(instr.targetReg, unusedReg++);
            instrs.push(new InstrSetReg(
                registerMap.get(instr.targetReg)!,
                registerMap.get(instr.sourceReg)!,
            ));
        }
        else if (instr instanceof InstrArgsStart) {
            instrs.push(new InstrArgsStart());
        }
        else if (instr instanceof InstrArgOne) {
            instrs.push(new InstrArgOne(
                registerMap.get(instr.register)!,
            ));
        }
        else if (instr instanceof InstrArgsEnd) {
            instrs.push(new InstrArgsEnd());
        }
        else if (instr instanceof InstrSetApply) {
            registerMap.set(instr.targetReg, unusedReg++);
            instrs.push(new InstrSetApply(
                registerMap.get(instr.targetReg)!,
                registerMap.get(instr.funcReg)!,
            ));
        }
        else if (instr instanceof InstrJmp) {
            throw new Error("Need to handle labels/jumps in 'inline'");
        }
        else if (instr instanceof InstrJmpUnlessReg) {
            throw new Error("Need to handle labels/jumps in 'inline'");
        }
        else {
            let _coverageCheck: never = instr;
            return _coverageCheck;
        }
    }

    throw new Error("Malformed bytecode: fell off the end");
}

