export interface Header {
    req: string;
    reg: string;
}

export type Instr =
    InstrSetPrimIdRegSym |
    InstrSetPrimTypeReg |
    InstrSetSym |
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
}

export class InstrSetPrimTypeReg {
    constructor(public targetReg: number, public objectReg: number) {
    }
}

export class InstrSetSym {
    constructor(public targetReg: number, public sym: string) {
    }
}

export class InstrArgsStart {
}

export class InstrArgOne {
    constructor(public register: number) {
    }
}

export class InstrArgsEnd {
}

export class InstrSetApply {
    constructor(public targetReg: number, public funcReg: number) {
    }
}

export class InstrSetGetGlobal {
    constructor(public targetReg: number, public name: string) {
    }
}

export class InstrReturnReg {
    constructor(public returnReg: number) {
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
        else if (instr instanceof InstrSetSym) {
            line = set(instr.targetReg, `(sym '${instr.sym})`);
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

