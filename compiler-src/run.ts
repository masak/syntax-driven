import {
    Instr,
    InstrArgOne,
    InstrArgsEnd,
    InstrArgsStart,
    InstrSetApply,
    InstrSetGetGlobal,
    InstrSetPrimIdRegSym,
    InstrSetPrimTypeReg,
    InstrReturnReg,
    Target,
} from "./target";
import {
    symbol,
    SYMBOL_NIL,
    SYMBOL_T,
    Val,
    ValByteFn,
    ValChar,
    ValFn,
    ValPair,
    ValSymbol,
} from "./val";
import {
    Env,
} from "./env";

type Reaction =
    ReactionNext |
    ReactionReturn;

class ReactionNext {
}

const NEXT = new ReactionNext();

class ReactionReturn {
    constructor(public val: Val) {
    }
}

export class Runtime {
    constructor(public env: Env) {
    }

    private step(
        instr: Instr,
        registers: Array<Val>,
        applyArgs: Array<Val>,
    ): Reaction {
        if (instr instanceof InstrSetPrimIdRegSym) {
            let leftValue = registers[instr.leftReg];
            registers[instr.targetReg] =
                leftValue instanceof ValSymbol &&
                leftValue.name === instr.rightSym
                    ? SYMBOL_T
                    : SYMBOL_NIL;
            return NEXT;
        }
        else if (instr instanceof InstrReturnReg) {
            return new ReactionReturn(registers[instr.returnReg]);
        }
        else if (instr instanceof InstrSetGetGlobal) {
            let target: Target = this.env.get(instr.name);
            registers[instr.targetReg] = new ValFn(target);
            return NEXT;
        }
        else if (instr instanceof InstrSetPrimTypeReg) {
            let value = registers[instr.objectReg];
            let result: ValSymbol;
            if (value instanceof ValChar) {
                result = symbol("char");
            }
            else if (value instanceof ValFn ||
                        value instanceof ValByteFn ||
                        value instanceof ValPair) {
                result = symbol("pair");
            }
            else if (value instanceof ValSymbol) {
                result = symbol("symbol");
            }
            else {
                let _coverageCheck: never = value;
                return _coverageCheck;
            }
            registers[instr.targetReg] = result;
            return NEXT;
        }
        else if (instr instanceof InstrArgsStart) {
            // Well, isn't JavaScript fun. I guess we could also use
            // `splice` here, but it does seem more direct just to
            // set the length.
            applyArgs.length = 0;
            return NEXT;
        }
        else if (instr instanceof InstrArgOne) {
            let value = registers[instr.register];
            applyArgs.push(value);
            return NEXT;
        }
        else if (instr instanceof InstrArgsEnd) {
            // do nothing
            return NEXT;
        }
        else if (instr instanceof InstrSetApply) {
            let valFn = registers[instr.funcReg];
            if (!(valFn instanceof ValFn)) {
                throw new Error("Can't apply: not a function");
            }
            // TODO: CPS-transform
            let retValue = this.run(valFn.fn, applyArgs);
            registers[instr.targetReg] = retValue;
            return NEXT;
        }
        else {
            let _coverageCheck: never = instr;
            return _coverageCheck;
        }
    }

    run(func: Target, funcArgs: Array<Val>): Val {
        let registers: Array<Val> =
            new Array(func.header.regCount).fill(SYMBOL_NIL);
        for (let i = 0; i < func.header.reqCount; i++) {
            registers[i] = funcArgs[i];
        }

        let applyArgs: Array<Val> = [];

        let ip = 0;
        let instrs = func.body;
        while (true) {
            let instr = instrs[ip];
            let reaction = this.step(instr, registers, applyArgs);

            if (reaction instanceof ReactionNext) {
                ip++;
                if (ip >= instrs.length) {
                    throw new Error("Malformed bytecode: fell off the end");
                }
            }
            else if (reaction instanceof ReactionReturn) {
                return reaction.val;
            }
            else {
                let _coverageCheck: never = reaction;
                return _coverageCheck;
            }
        }
    }

    fn(name: string) {
        let target = this.env.get(name);
        return new ValFn(target);
    }
}

