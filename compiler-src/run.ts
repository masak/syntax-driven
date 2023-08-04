import {
    Instr,
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

    private step(instr: Instr, registers: Array<Val>): Reaction {
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
        else {
            throw new Error(
                `Unknown instruction in 'run': ${instr.constructor.name}`
            );
        }
    }

    run(func: Target, args: Array<Val>): Val {
        let m: RegExpMatchArray;
        let maxReqReg = (m = /^%(\d+)$/.exec(func.header.req)!)
            ? Number(m[1])
            : (function () {
                throw new Error(`Couldn't parse req: '${func.header.req}'`)
               })();
        let maxReg = (m = /^%\d+..%(\d+)$/.exec(func.header.reg)!)
            ? Number(m[1])
            : (function () {
                throw new Error(`Couldn't parse reg: '${func.header.reg}'`)
              })();

        let registers = new Array(maxReg + 1).fill(SYMBOL_NIL);
        for (let i = 0; i <= maxReqReg; i++) {
            registers[i] = args[i];
        }

        let ip = 0;
        let instrs = func.body;
        while (true) {
            let instr = instrs[ip];
            let reaction = this.step(instr, registers);

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
}

