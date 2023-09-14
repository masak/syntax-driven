import {
    Bytecode,
    OPCODE_ARGS_END,
    OPCODE_ARGS_START,
    OPCODE_ARG_ONE,
    OPCODE_JMP,
    OPCODE_JMP_IF,
    OPCODE_JMP_UNLESS,
    OPCODE_RETURN_REG,
    OPCODE_SET_APPLY,
    OPCODE_SET_GLOBAL,
    OPCODE_SET_PRIM_CAR_REG,
    OPCODE_SET_PRIM_CDR_REG,
    OPCODE_SET_PRIM_ID_REG_NIL,
    OPCODE_SET_PRIM_ID_REG_SYM,
    OPCODE_SET_PRIM_ID_REG_T,
    OPCODE_SET_PRIM_TYPE_REG,
    OPCODE_SET_NIL,
    OPCODE_SET_REG,
    OPCODE_SET_T,
} from "./bytecode";
import {
    symbol,
    SYMBOL_NIL,
    SYMBOL_T,
    Val,
    ValChar,
    ValByteFn,
    ValPair,
    ValSymbol,
} from "./val";

type Reaction =
    ReactionNext |
    ReactionReturn |
    ReactionJump;

class ReactionNext {
}

const NEXT = new ReactionNext();

class ReactionReturn {
    constructor(public val: Val) {
    }
}

class ReactionJump {
    constructor(public targetIp: number) {
    }
}

export class BcRuntime {
    constructor(public bytecode: Bytecode) {
    }

    private step(
        instr: [number, number, number, number],
        registers: Array<Val>,
        applyArgs: Array<Val>,
    ): Reaction {
        let opcode = instr[0];
        if (opcode === OPCODE_SET_PRIM_ID_REG_SYM) {
            let targetReg = instr[1];
            let leftReg = instr[2];
            let rightSym = this.bytecode.getString(instr[3]);
            let leftValue = registers[leftReg];
            if (leftValue instanceof ValSymbol) {
                registers[targetReg] = leftValue.name === rightSym
                    ? SYMBOL_T
                    : SYMBOL_NIL;
            }
            else {
                registers[targetReg] = SYMBOL_NIL;
            }
            return NEXT;
        }
        else if (opcode === OPCODE_SET_PRIM_ID_REG_NIL) {
            let targetReg = instr[1];
            let leftReg = instr[2];
            let leftValue = registers[leftReg];
            if (leftValue instanceof ValSymbol) {
                registers[targetReg] = leftValue.name === "nil"
                    ? SYMBOL_T
                    : SYMBOL_NIL;
            }
            else {
                registers[targetReg] = SYMBOL_NIL;
            }
            return NEXT;
        }
        else if (opcode === OPCODE_SET_PRIM_ID_REG_T) {
            let targetReg = instr[1];
            let leftReg = instr[2];
            let leftValue = registers[leftReg];
            if (leftValue instanceof ValSymbol) {
                registers[targetReg] = leftValue.name === "t"
                    ? SYMBOL_T
                    : SYMBOL_NIL;
            }
            else {
                registers[targetReg] = SYMBOL_NIL;
            }
            return NEXT;
        }
        else if (opcode === OPCODE_SET_PRIM_CAR_REG) {
            let targetReg = instr[1];
            let objectReg = instr[2];
            let objectValue = registers[objectReg];
            if (objectValue instanceof ValSymbol &&
                objectValue.name === "nil") {
                registers[targetReg] = SYMBOL_NIL;
            }
            else if (objectValue instanceof ValPair) {
                registers[targetReg] = objectValue.a;
            }
            else {
                throw new Error("car-on-atom");
            }
            return NEXT;
        }
        else if (opcode === OPCODE_SET_PRIM_CDR_REG) {
            let targetReg = instr[1];
            let objectReg = instr[2];
            let objectValue = registers[objectReg];
            if (objectValue instanceof ValSymbol &&
                objectValue.name === "nil") {
                registers[targetReg] = SYMBOL_NIL;
            }
            else if (objectValue instanceof ValPair) {
                registers[targetReg] = objectValue.d;
            }
            else {
                throw new Error("car-on-atom");
            }
            return NEXT;
        }
        else if (opcode === OPCODE_RETURN_REG) {
            let returnReg = instr[2];
            return new ReactionReturn(registers[returnReg]);
        }
        else if (opcode === OPCODE_SET_GLOBAL) {
            let targetReg = instr[1];
            let addr: number = this.bytecode.getGlobal(instr[2]);
            registers[targetReg] = new ValByteFn(addr);
            return NEXT;
        }
        else if (opcode === OPCODE_SET_PRIM_TYPE_REG) {
            let targetReg = instr[1];
            let objectReg = instr[2];
            let value = registers[objectReg];
            let result: ValSymbol;
            if (value instanceof ValChar) {
                result = symbol("char");
            }
            else if (value instanceof ValByteFn || value instanceof ValPair) {
                result = symbol("pair");
            }
            else if (value instanceof ValSymbol) {
                result = symbol("symbol");
            }
            else {
                let _coverageCheck: never = value;
                return _coverageCheck;
            }
            registers[targetReg] = result;
            return NEXT;
        }
        else if (opcode === OPCODE_SET_REG) {
            let targetReg = instr[1];
            let sourceReg = instr[2];
            let value = registers[sourceReg];
            registers[targetReg] = value;
            return NEXT;
        }
        else if (opcode === OPCODE_SET_NIL) {
            let targetReg = instr[1];
            registers[targetReg] = SYMBOL_NIL;
            return NEXT;
        }
        else if (opcode === OPCODE_SET_T) {
            let targetReg = instr[1];
            registers[targetReg] = SYMBOL_T;
            return NEXT;
        }
        else if (opcode === OPCODE_ARGS_START) {
            // Well, isn't JavaScript fun. I guess we could also use
            // `splice` here, but it does seem more direct just to
            // set the length.
            applyArgs.length = 0;
            return NEXT;
        }
        else if (opcode === OPCODE_ARG_ONE) {
            let register = instr[1];
            let value = registers[register];
            applyArgs.push(value);
            return NEXT;
        }
        else if (opcode === OPCODE_ARGS_END) {
            // do nothing
            return NEXT;
        }
        else if (opcode === OPCODE_SET_APPLY) {
            let targetReg = instr[1];
            let funcReg = instr[2];
            let valByteFn = registers[funcReg];
            if (!(valByteFn instanceof ValByteFn)) {
                throw new Error("Can't apply: not a byte function");
            }
            // TODO: CPS-transform
            let retValue = this.run(valByteFn.addr, applyArgs);
            registers[targetReg] = retValue;
            return NEXT;
        }
        else if (opcode === OPCODE_JMP_IF) {
            let testReg = instr[1];
            let targetIp = instr[2];
            let testValue = registers[testReg];
            if (testValue instanceof ValSymbol && testValue.name !== "nil") {
                return new ReactionJump(targetIp);
            }
            else {
                return NEXT;
            }
        }
        else if (opcode === OPCODE_JMP_UNLESS) {
            let testReg = instr[1];
            let targetIp = instr[2];
            let testValue = registers[testReg];
            if (testValue instanceof ValSymbol && testValue.name === "nil") {
                return new ReactionJump(targetIp);
            }
            else {
                return NEXT;
            }
        }
        else if (opcode === OPCODE_JMP) {
            let targetIp = instr[2];
            return new ReactionJump(targetIp);
        }
        else {
            let hexOpcode = opcode.toString(16);
            throw new Error(`Unrecognized opcode 0x${hexOpcode}`);
        }
    }

    run(func: string | number, funcArgs: Array<Val>): Val {
        let addr: number;
        if (typeof func === "number") {
            addr = func;
        }
        else {
            addr = this.bytecode.findGlobal(func);
        }

        let [reqCount, , regCount, instrCount] = this.bytecode.get4Bytes(addr);

        let registers: Array<Val> = new Array(regCount).fill(SYMBOL_NIL);
        for (let i = 0; i < reqCount; i++) {
            registers[i] = funcArgs[i];
        }

        let applyArgs: Array<Val> = [];

        let ip = 4; // skipping past the 4-byte header
        while (true) {
            let instr = this.bytecode.get4Bytes(addr + ip);
            let reaction = this.step(instr, registers, applyArgs);

            if (reaction instanceof ReactionNext) {
                ip += 4;
                if (ip >= 4 + 4 * instrCount) {
                    throw new Error("Malformed bytecode: fell off the end");
                }
            }
            else if (reaction instanceof ReactionReturn) {
                return reaction.val;
            }
            else if (reaction instanceof ReactionJump) {
                ip = 4 + 4 * reaction.targetIp;
            }
            else {
                let _coverageCheck: never = reaction;
                return _coverageCheck;
            }
        }
    }

    fn(name: string): ValByteFn {
        let addr = this.bytecode.findGlobal(name);
        return new ValByteFn(addr);
    }
}

