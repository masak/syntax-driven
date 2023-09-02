export interface Header {
    reqCount: number;
    regCount: number;
}

export type Register = number;

export type Instr =
    InstrArgsStart |
    InstrArgOne |
    InstrArgsEnd |
    InstrJmp |
    InstrSetApply |
    InstrSetGetGlobal |
    InstrSetGetSymbol |
    InstrSetPrimCarReg |
    InstrSetPrimCdrReg |
    InstrSetPrimIdRegSym |
    InstrSetPrimTypeReg |
    InstrSetReg |
    InstrReturnReg |
    InstrJmpUnlessReg;

export type SetInstr =
    InstrSetApply |
    InstrSetGetGlobal |
    InstrSetGetSymbol |
    InstrSetPrimCarReg |
    InstrSetPrimCdrReg |
    InstrSetPrimIdRegSym |
    InstrSetPrimTypeReg |
    InstrSetReg;

export class InstrSetPrimCarReg {
    constructor(public targetReg: Register, public objectReg: Register) {
    }
}

export class InstrSetPrimCdrReg {
    constructor(public targetReg: Register, public objectReg: Register) {
    }
}

export class InstrSetPrimIdRegSym {
    constructor(
        public targetReg: Register,
        public leftReg: Register,
        public rightSym: string,
    ) {
    }
}

export class InstrSetPrimTypeReg {
    constructor(public targetReg: Register, public objectReg: Register) {
    }
}

export class InstrSetReg {
    constructor(public targetReg: Register, public sourceReg: Register) {
    }
}

export class InstrArgsStart {
    constructor() {
    }
}

export class InstrArgOne {
    constructor(public register: number) {
    }
}

export class InstrArgsEnd {
    constructor() {
    }
}

export class InstrJmp {
    constructor(public label: string) {
    }
}

export class InstrSetApply {
    constructor(public targetReg: Register, public funcReg: Register) {
    }
}

export class InstrSetGetGlobal {
    constructor(public targetReg: Register, public name: string) {
    }
}

export class InstrSetGetSymbol {
    constructor(public targetReg: Register, public name: string) {
    }
}

export class InstrReturnReg {
    constructor(public returnReg: Register) {
    }
}

export class InstrJmpUnlessReg {
    constructor(public label: string, public testReg: Register) {
    }
}

export function isSetInstr(instr: Instr): instr is SetInstr {
    return instr.hasOwnProperty("targetReg");
}

export class Target {
    constructor(
        public name: string,
        public header: Header,
        public body: Array<Instr>,
        public labels: Map<string, number>,
    ) {
    }
}

function dump(
    instructions: Array<Instr>,
    labels: Map<string, number>,
): string {
    function set(instr: SetInstr, rest: string): string {
        let leftArrow = String.fromCodePoint(8592);
        return `%${instr.targetReg} ${leftArrow} ${rest}`;
    }

    let lines: Array<string> = [];
    let instrIndex = 0;
    for (let instr of instructions) {
        for (let label of labels.keys()) {
            if (labels.get(label) === instrIndex) {
                lines.push(`  :${label}`);
            }
        }

        let line: string;
        if (instr instanceof InstrSetPrimIdRegSym) {
            line = set(
                instr,
                `(id %${instr.leftReg} ${instr.rightSym})`,
            );
        }
        else if (instr instanceof InstrSetPrimTypeReg) {
            line = set(instr, `(type %${instr.objectReg})`);
        }
        else if (instr instanceof InstrSetPrimCarReg) {
            line = set(instr, `(car %${instr.objectReg})`);
        }
        else if (instr instanceof InstrSetPrimCdrReg) {
            line = set(instr, `(cdr %${instr.objectReg})`);
        }
        else if (instr instanceof InstrSetReg) {
            line = set(instr, `%${instr.sourceReg}`);
        }
        else if (instr instanceof InstrArgsStart) {
            line = "(args-start)";
        }
        else if (instr instanceof InstrArgOne) {
            line = `  (arg-one %${instr.register})`;
        }
        else if (instr instanceof InstrArgsEnd) {
            line = "(args-end)";
        }
        else if (instr instanceof InstrSetApply) {
            line = set(instr, `(apply %${instr.funcReg})`);
        }
        else if (instr instanceof InstrSetGetGlobal) {
            line = set(instr, `(get-global "${instr.name}")`);
        }
        else if (instr instanceof InstrSetGetSymbol) {
            line = set(instr, `(get-symbol "${instr.name}")`);
        }
        else if (instr instanceof InstrReturnReg) {
            line = `return %${instr.returnReg}`;
        }
        else if (instr instanceof InstrJmp) {
            line = `jmp :${instr.label}`;
        }
        else if (instr instanceof InstrJmpUnlessReg) {
            line = `jmp :${instr.label} unless %${instr.testReg}`;
        }
        else {
            let _coverageCheck: never = instr;
            return _coverageCheck;
        }
        line = " ".repeat(5) + line;
        lines.push(line);
        instrIndex += 1;
    }
    return lines.join("\n");
}

export function stringifyTarget(
    { name, header, body, labels }: Target,
): string {
    let { reqCount, regCount } = header;
    let req = reqCount === 1
        ? "%0"
        : `%0..%${reqCount - 1}`;
    let reg = regCount === 1
        ? "%0"
        : `%0..%${regCount - 1}`;
    let headerDesc = `[req: ${req}; reg: ${reg}]`;
    return `bcfn ${name} ${headerDesc}` + "\n" + dump(body, labels);
}

