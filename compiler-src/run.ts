import {
    InstrSetPrimIdRegSym,
    InstrReturnReg,
    Target,
} from "./target";
import {
    SYMBOL_NIL,
    SYMBOL_T,
    Val,
    ValSymbol,
} from "./val";

export function run(func: Target, args: Array<Val>): Val {
    let m: RegExpMatchArray;
    let maxReqReg = (m = /^%(\d+)$/.exec(func.header.req)!)
        ? Number(m[1])
        : (function () {
            throw new Error(`Couldn't parse req: '${func.header.req}'`) })();
    let maxReg = (m = /^%\d+..%(\d+)$/.exec(func.header.reg)!)
        ? Number(m[1])
        : (function () {
            throw new Error(`Couldn't parse reg: '${func.header.reg}'`) })();

    let registers = new Array(maxReg + 1).fill(SYMBOL_NIL);
    for (let i = 0; i <= maxReqReg; i++) {
        registers[i] = args[i];
    }

    for (let instr of func.body) {
        if (instr instanceof InstrSetPrimIdRegSym) {
            let leftValue = registers[instr.leftReg];
            registers[instr.targetReg] =
                leftValue instanceof ValSymbol &&
                leftValue.name === instr.rightSym
                    ? SYMBOL_T
                    : SYMBOL_NIL;
        }
        else if (instr instanceof InstrReturnReg) {
            return registers[instr.returnReg];
        }
        else {
            throw new Error(
                `Unknown instruction in 'run': ${instr.constructor.name}`
            );
        }
    }

    throw new Error("Malformed bytecode: fell off the end");
}

