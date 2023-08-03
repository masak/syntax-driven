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

export class BaseInstr {
    constructor(...args: any) {
    }
}

export class InstrSetPrimIdRegSym extends BaseInstr {
    constructor(
        public targetReg: number,
        public leftReg: number,
        public rightSym: string,
    ) {
        super();
    }
}

export class InstrSetPrimTypeReg extends BaseInstr {
    constructor(public targetReg: number, public objectReg: number) {
        super();
    }
}

export class InstrArgsStart extends BaseInstr {
    constructor() {
        super();
    }
}

export class InstrArgOne extends BaseInstr {
    constructor(public register: number) {
        super();
    }
}

export class InstrArgsEnd extends BaseInstr {
    constructor() {
        super();
    }
}

export class InstrSetApply extends BaseInstr {
    constructor(public targetReg: number, public funcReg: number) {
        super();
    }
}

export class InstrSetGetGlobal extends BaseInstr {
    constructor(public targetReg: number, public name: string) {
        super();
    }
}

export class InstrReturnReg extends BaseInstr {
    constructor(public returnReg: number) {
        super();
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

