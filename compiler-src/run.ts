import {
    InstrSetPrimIdRegSym,
    InstrReturnReg,
    Target,
} from "./target";

type Val =
    ValSymbol;

class ValSymbol {
    constructor(public name: string) {
    }
}

export const SYMBOL_NIL = new ValSymbol("nil");
export const SYMBOL_T = new ValSymbol("t");

export function showVal(val: Val): string {
    if (val instanceof ValSymbol) {
        return val.name;
    }
    else {
        let _coverageCheck: never = val;
        return _coverageCheck;
    }
}

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

