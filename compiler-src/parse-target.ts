import {
    Instr,
    InstrSetPrimIdRegSym,
    InstrSetPrimTypeReg,
    InstrArgsStart,
    InstrArgOne,
    InstrArgsEnd,
    InstrSetApply,
    InstrSetGetGlobal,
    InstrReturnReg,
    Target,
} from "./target";

const EMPTY_LINE = /^\s*$/;
const HEADER = /^bcfn\s+(\w+)\s*\[req:\s*%(\d+);\s*reg:\s*%0..%(\d+)\]$/;

const SET_PRIM_ID_REG_SYM = /^%(\d+)\s*←\s*\(id\s+%(\d+)\s+'?(\w+)\)$/;
const SET_PRIM_TYPE_REG = /^%(\d+)\s*←\s*\(type\s+%(\d+)\)$/;
const ARGS_START = /^\(args-start\)$/;
const ARG_ONE = /^\(arg-one\s*%(\d+)\)$/;
const ARGS_END = /^\(args-end\)$/;
const SET_APPLY = /^%(\d+)\s*←\s*\(apply\s+%(\d+)\)$/;
const SET_GET_GLOBAL = /^%(\d+)\s*←\s*\(get-global\s+"([^"]*)"\)$/;
const RETURN_REG = /^return\s*%(\d+)$/;

export function parse(input: string): Target {
    let instrs: Array<Instr> = [];

    let name = "<unset>";
    let maxReqReg = 0;
    let maxReg = 0;

    for (let line of input.split("\n")) {
        if (EMPTY_LINE.test(line)) {
            continue;
        }

        line = line.trim();

        let m: RegExpExecArray;
        if (m = HEADER.exec(line)!) {
            name = m[1];
            maxReqReg = Number(m[2]);
            maxReg = Number(m[3]);
        }
        else if (m = SET_PRIM_ID_REG_SYM.exec(line)!) {
            let targetReg = Number(m[1]);
            let leftReg = Number(m[2]);
            let rightSym = m[3];
            instrs.push(
                new InstrSetPrimIdRegSym(targetReg, leftReg, rightSym)
            );
        }
        else if (m = SET_PRIM_TYPE_REG.exec(line)!) {
            let targetReg = Number(m[1]);
            let objectReg = Number(m[2]);
            instrs.push(new InstrSetPrimTypeReg(targetReg, objectReg));
        }
        else if (m = ARGS_START.exec(line)!) {
            instrs.push(new InstrArgsStart());
        }
        else if (m = ARG_ONE.exec(line)!) {
            let register = Number(m[1]);
            instrs.push(new InstrArgOne(register));
        }
        else if (m = ARGS_END.exec(line)!) {
            instrs.push(new InstrArgsEnd());
        }
        else if (m = SET_APPLY.exec(line)!) {
            let targetReg = Number(m[1]);
            let funcReg = Number(m[2]);
            instrs.push(new InstrSetApply(targetReg, funcReg));
        }
        else if (m = RETURN_REG.exec(line)!) {
            let returnReg = Number(m[1]);
            instrs.push(new InstrReturnReg(returnReg));
        }
        else if (m = SET_GET_GLOBAL.exec(line)!) {
            let targetReg = Number(m[1]);
            let name = m[2];
            instrs.push(new InstrSetGetGlobal(targetReg, name));
        }
        else {
            throw new Error(`Unrecognized line: '${line}'`);
        }
    }

    if (name === "<unset>") {
        throw new Error("Parse error: no header line");
    }

    let req = maxReqReg === 0
        ? "%0"
        : `%0..%${maxReqReg}`;

    let reg = maxReg === 0
        ? "%0"
        : `%0..%${maxReg}`;

    return new Target(name, { req, reg }, instrs);
}

