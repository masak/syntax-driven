export interface Header {
    req: string;
    reg: string;
}

export type Instr =
    InstrSetPrimIdRegSym |
    InstrSetPrimTypeReg |
    InstrArgsStart |
    InstrArgOne |
    InstrArgsEnd |
    InstrSetApply |
    InstrSetGetGlobal |
    InstrReturnReg;

export class InstrSetPrimIdRegSym {
    constructor(
        public targetReg: number,
        public leftReg: number,
        public rightSym: string,
    ) {
    }

    static re =
        /^%(\d+)\s*←\s*\(id\s+%(\d+)\s+'?(\w+)\)$/;

    static matches(input: string) {
        return InstrSetPrimIdRegSym.re.test(input);
    }

    static parse(input: string) {
        let m = InstrSetPrimIdRegSym.re.exec(input);
        if (m === null) {
            throw new Error(`Couldn't parse '${input}'`);
        }
        return new InstrSetPrimIdRegSym(Number(m[1]), Number(m[2]), m[3]);
    }
}

export class InstrSetPrimTypeReg {
    constructor(public targetReg: number, public objectReg: number) {
    }

    static re =
        /^%(\d+)\s*←\s*\(type\s+%(\d+)\)$/;

    static matches(input: string) {
        return InstrSetPrimTypeReg.re.test(input);
    }

    static parse(input: string) {
        let m = InstrSetPrimTypeReg.re.exec(input);
        if (m === null) {
            throw new Error(`Couldn't parse '${input}'`);
        }
        return new InstrSetPrimTypeReg(Number(m[1]), Number(m[2]));
    }
}

export class InstrArgsStart {
    static re = /^\(args-start\)$/;

    static matches(input: string) {
        return InstrArgsStart.re.test(input);
    }

    static parse(input: string) {
        let m = InstrArgsStart.re.exec(input);
        if (m === null) {
            throw new Error(`Couldn't parse '${input}'`);
        }
        return new InstrArgsStart();
    }
}

export class InstrArgOne {
    constructor(public register: number) {
    }

    static re = /^\(arg-one\s*%(\d+)\)$/;

    static matches(input: string) {
        return InstrArgOne.re.test(input);
    }

    static parse(input: string) {
        let m = InstrArgOne.re.exec(input);
        if (m === null) {
            throw new Error(`Couldn't parse '${input}'`);
        }
        return new InstrArgOne(Number(m[1]));
    }
}

export class InstrArgsEnd {
    static re = /^\(args-end\)$/;

    static matches(input: string) {
        return InstrArgsEnd.re.test(input);
    }

    static parse(input: string) {
        let m = InstrArgsEnd.re.exec(input);
        if (m === null) {
            throw new Error(`Couldn't parse '${input}'`);
        }
        return new InstrArgsEnd();
    }
}

export class InstrSetApply {
    constructor(public targetReg: number, public funcReg: number) {
    }

    static re = /^%(\d+)\s*←\s*\(apply\s+%(\d+)\)$/;

    static matches(input: string) {
        return InstrSetApply.re.test(input);
    }

    static parse(input: string) {
        let m = InstrSetApply.re.exec(input);
        if (m === null) {
            throw new Error(`Couldn't parse '${input}'`);
        }
        return new InstrSetApply(Number(m[1]), Number(m[2]));
    }
}

export class InstrSetGetGlobal {
    constructor(public targetReg: number, public name: string) {
    }

    static re = /^%(\d+)\s*←\s*\(get-global\s+"([^"]*)"\)$/;

    static matches(input: string) {
        return InstrSetGetGlobal.re.test(input);
    }

    static parse(input: string) {
        let m = InstrSetGetGlobal.re.exec(input);
        if (m === null) {
            throw new Error(`Couldn't parse '${input}'`);
        }
        return new InstrSetGetGlobal(Number(m[1]), m[2]);
    }
}

export class InstrReturnReg {
    constructor(public returnReg: number) {
    }

    static re = /^return\s*%(\d+)$/;

    static matches(input: string) {
        return InstrReturnReg.re.test(input);
    }

    static parse(input: string) {
        let m = InstrReturnReg.re.exec(input);
        if (m === null) {
            throw new Error(`Couldn't parse '${input}'`);
        }
        return new InstrReturnReg(Number(m[1]));
    }
}

export class Target {
    constructor(
        public name: string,
        public header: Header,
        public body: Array<Instr>,
    ) {
    }
}

function dump(instructions: Array<Instr>): string {
    function set(targetReg: number, rest: string): string {
        let leftArrow = String.fromCodePoint(8592);
        return `%${targetReg} ${leftArrow} ${rest}`;
    }

    let lines: Array<string> = [];
    for (let instr of instructions) {
        let line: string;
        if (instr instanceof InstrSetPrimIdRegSym) {
            line = set(
                instr.targetReg,
                `(id %${instr.leftReg} ${instr.rightSym})`,
            );
        }
        else if (instr instanceof InstrSetPrimTypeReg) {
            line = set(instr.targetReg, `(type %${instr.objectReg})`);
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
            line = set(instr.targetReg, `(apply %${instr.funcReg})`);
        }
        else if (instr instanceof InstrSetGetGlobal) {
            line = set(instr.targetReg, `(get-global "${instr.name}")`);
        }
        else if (instr instanceof InstrReturnReg) {
            line = `(return %${instr.returnReg})`;
        }
        else {
            let _coverageCheck: never = instr;
            return _coverageCheck;
        }
        line = " ".repeat(5) + line;
        lines.push(line);
    }
    return lines.join("\n");
}

export function stringifyTarget({ name, header, body }: Target): string {
    let headerDesc = `[req: ${header.req}; reg: ${header.reg}]`;
    return `bcfn ${name} ${headerDesc}` + "\n" + dump(body);
}

