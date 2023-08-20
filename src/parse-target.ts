import {
    Instr,
    InstrArgsStart,
    InstrArgOne,
    InstrArgsEnd,
    InstrJmp,
    InstrJmpUnlessReg,
    InstrReturnReg,
    InstrSetApply,
    InstrSetGetGlobal,
    InstrSetGetSymbol,
    InstrSetPrimCarReg,
    InstrSetPrimCdrReg,
    InstrSetPrimIdRegSym,
    InstrSetPrimTypeReg,
    InstrSetReg,
    Target,
} from "./target";

const EMPTY_LINE = /^\s*$/;
const HEADER =
    /^bcfn\s+(\w+)\s*\[req:\s*(?:%0\.\.)?%(\d+);\s*reg:\s*(?:%0\.\.)?%(\d+)\]$/;

let parsers: Array<[string, Function | "LABEL"]> = [
    [",reg ← (id ,reg ,sym)", InstrSetPrimIdRegSym],
    [",reg ← (type ,reg)", InstrSetPrimTypeReg],
    [",reg ← (car ,reg)", InstrSetPrimCarReg],
    [",reg ← (cdr ,reg)", InstrSetPrimCdrReg],
    [",reg ← ,reg", InstrSetReg],
    ["(args-start)", InstrArgsStart],
    ["(arg-one ,reg)", InstrArgOne],
    ["(args-end)", InstrArgsEnd],
    ["jmp ,lab", InstrJmp],
    ["jmp ,lab unless ,reg", InstrJmpUnlessReg],
    ["return ,reg", InstrReturnReg],
    [",reg ← (apply ,reg)", InstrSetApply],
    [",reg ← (get-global ,str)", InstrSetGetGlobal],
    [",reg ← (get-symbol ,str)", InstrSetGetSymbol],
    [",lab", "LABEL"],
];

const REG = /^%(\d+)/;
const SYM = /^'?(\w+)/;
const STR = /^"([^"]*)"/;
const LAB = /^:([^\s]+)/;

function parseInstr(input: string): Instr | string | null {
    PATTERN:
    for (let [pattern, action] of parsers) {
        let inputPos = 0;
        let patternPos = 0;
        let args: Array<number | string> = [];
        let m: RegExpExecArray;

        while (patternPos < pattern.length) {
            if (pattern.charAt(patternPos) === ",") {
                patternPos += 1;
                let commaType = pattern.substring(patternPos, patternPos + 3);
                if (commaType === "reg") {
                    if (m = REG.exec(input.substring(inputPos))!) {
                        inputPos += m[0].length;
                        args.push(Number(m[1]));
                        patternPos += 3;
                    }
                    else {
                        continue PATTERN;
                    }
                }
                else if (commaType === "sym") {
                    if (m = SYM.exec(input.substring(inputPos))!) {
                        inputPos += m[0].length;
                        args.push(m[1]);
                        patternPos += 3;
                    }
                    else {
                        continue PATTERN;
                    }
                }
                else if (commaType === "str") {
                    if (m = STR.exec(input.substring(inputPos))!) {
                        inputPos += m[0].length;
                        args.push(m[1]);
                        patternPos += 3;
                    }
                    else {
                        continue PATTERN;
                    }
                }
                else if (commaType === "lab") {
                    if (m = LAB.exec(input.substring(inputPos))!) {
                        inputPos += m[0].length;
                        args.push(m[1]);
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
        if (inputPos < input.length) {
            continue PATTERN;
        }
        if (action === "LABEL") {
            let arg = args[0];
            if (typeof arg === "string") {
                return arg;
            }
            else {
                throw new Error("Label instruction with wrong type arg");
            }
        }
        else {
            return new (action as any)(...args);
        }
    }
    return null;
}

export function parse(input: string): Target {
    let instrs: Array<Instr> = [];

    let name = "<unset>";
    let maxReqReg = 0;
    let maxReg = 0;
    let labels = new Map<string, number>();

    for (let line of input.split("\n")) {
        if (EMPTY_LINE.test(line)) {
            continue;
        }

        line = line.trim();

        let m: RegExpExecArray;
        let instrOrLabel: Instr | string;

        if (m = HEADER.exec(line)!) {
            name = m[1];
            maxReqReg = Number(m[2]);
            maxReg = Number(m[3]);
            continue;
        }
        else if (instrOrLabel = parseInstr(line)!) {
            if (typeof instrOrLabel === "string") {
                let label = instrOrLabel;
                labels.set(label, instrs.length);
            }
            else { // Instr
                let instr = instrOrLabel;
                instrs.push(instr);
            }
        }
        else {
            throw new Error(`Unrecognized line: '${line}'`);
        }
    }

    if (name === "<unset>") {
        throw new Error("Parse error: no header line");
    }

    let reqCount = maxReqReg + 1;
    let regCount = maxReg + 1;

    return new Target(name, { reqCount, regCount }, instrs, labels);
}

