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
        let instr: Instr;

        if (m = HEADER.exec(line)!) {
            name = m[1];
            maxReqReg = Number(m[2]);
            maxReg = Number(m[3]);
            continue;
        }
        else if (InstrSetPrimIdRegSym.matches(line)) {
            instr = InstrSetPrimIdRegSym.parse(line);
        }
        else if (InstrSetPrimTypeReg.matches(line)) {
            instr = InstrSetPrimTypeReg.parse(line);
        }
        else if (InstrArgsStart.matches(line)) {
            instr = InstrArgsStart.parse(line);
        }
        else if (InstrArgOne.matches(line)) {
            instr = InstrArgOne.parse(line);
        }
        else if (InstrArgsEnd.matches(line)) {
            instr = InstrArgsEnd.parse(line);
        }
        else if (InstrSetApply.matches(line)) {
            instr = InstrSetApply.parse(line);
        }
        else if (InstrReturnReg.matches(line)) {
            instr = InstrReturnReg.parse(line);
        }
        else if (InstrSetGetGlobal.matches(line)) {
            instr = InstrSetGetGlobal.parse(line);
        }
        else {
            throw new Error(`Unrecognized line: '${line}'`);
        }

        instrs.push(instr);
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

