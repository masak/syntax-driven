import {
    BaseInstr,
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

let parsers: Map<typeof BaseInstr, string> = new Map([
    [InstrSetPrimIdRegSym, ",reg ← (id ,reg ,sym)"],
    [InstrSetPrimTypeReg, ",reg ← (type ,reg)"],
    [InstrArgsStart, "(args-start)"],
    [InstrArgOne, "(arg-one ,reg)"],
    [InstrArgsEnd, "(args-end)"],
    [InstrSetApply, ",reg ← (apply ,reg)"],
    [InstrSetGetGlobal, ",reg ← (get-global ,str)"],
    [InstrReturnReg, "return ,reg"],
] as Array<[typeof BaseInstr, string]>);

const REG = /^%(\d+)/;
const SYM = /^'?(\w+)/;
const STR = /^"([^"]*)"/;

function parseInstr(input: string): Instr | null {
    PATTERN:
    for (let [constructor, pattern] of parsers.entries()) {
        let inputPos = 0;
        let patternPos = 0;
        let constructorArgs: Array<number | string> = [];
        let m: RegExpExecArray;

        while (patternPos < pattern.length) {
            if (pattern.charAt(patternPos) === ",") {
                patternPos += 1;
                let commaType = pattern.substring(patternPos, patternPos + 3);
                if (commaType === "reg") {
                    if (m = REG.exec(input.substring(inputPos))!) {
                        inputPos += m[0].length;
                        constructorArgs.push(Number(m[1]));
                        patternPos += 3;
                    }
                    else {
                        continue PATTERN;
                    }
                }
                else if (commaType === "sym") {
                    if (m = SYM.exec(input.substring(inputPos))!) {
                        inputPos += m[0].length;
                        constructorArgs.push(m[1]);
                        patternPos += 3;
                    }
                    else {
                        continue PATTERN;
                    }
                }
                else if (commaType === "str") {
                    if (m = STR.exec(input.substring(inputPos))!) {
                        inputPos += m[0].length;
                        constructorArgs.push(m[1]);
                        patternPos += 3;
                    }
                    else {
                        continue PATTERN;
                    }
                }
                else {
                    throw new Error(`Unknown comma type: ${commaType}`);
                }
            }
            else {
                if (inputPos >= input.length) {
                    continue PATTERN;
                }
                if (input.charAt(inputPos) !== pattern.charAt(patternPos)) {
                    continue PATTERN;
                }
                inputPos += 1;
                patternPos += 1;
            }
        }
        return new constructor(...constructorArgs);
    }
    return null;
}

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
        else if (instr = parseInstr(line)!) {
            instrs.push(instr);
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

