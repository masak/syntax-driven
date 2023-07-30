export interface Header {
    req: string;
    reg: string;
}

export type Instr =
    InstrSetParams |
    InstrSetPrimCar |
    InstrSetPrimCdr |
    InstrSetPrimIdRegSym |
    InstrSetPrimTypeReg |
    InstrSetReg |
    InstrSetSym |
    InstrJmp |
    InstrUnlessJmp |
    InstrArgIn |
    InstrArgNext |
    InstrArgMany |
    InstrArgOut |
    InstrSetApply |
    InstrErrIf |
    InstrSetGetGlobal |
    InstrReturnReg;

export class InstrSetParams {
    constructor(public targetReg: number) {
    }
}

export class InstrSetPrimCar {
    constructor(public targetReg: number, public pairReg: number) {
    }
}

export class InstrSetPrimCdr {
    constructor(public targetReg: number, public pairReg: number) {
    }
}

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

export class InstrSetReg {
    constructor(public targetReg: number, public sourceReg: number) {
    }
}

export class InstrSetSym {
    constructor(public targetReg: number, public sym: string) {
    }
}

export class InstrJmp {
    constructor(public label: number) {
    }
}

export class InstrUnlessJmp {
    constructor(public testReg: number, public label: number) {
    }
}

export class InstrArgIn {
}

export class InstrArgNext {
    constructor(public register: number) {
    }
}

export class InstrArgMany {
    constructor(public register: number) {
    }
}

export class InstrArgOut {
}

export class InstrSetApply {
    constructor(public targetReg: number, public funcReg: number) {
    }
}

export class InstrErrIf {
    constructor(public testReg: number, public errorMessage: string) {
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
        return `%${targetReg} <- ${rest}`;
    }

    let jumpTargetLines = new Set<number>();
    for (let instr of instructions) {
        if (instr instanceof InstrJmp) {
            jumpTargetLines.add(instr.label);
        }
        /* need to support if-jmp, too */
        else if (instr instanceof InstrUnlessJmp) {
            jumpTargetLines.add(instr.label);
        }
    }
    let lines: Array<string> = [];
    for (let instr of instructions) {
        let line: string;
        if (instr instanceof InstrSetParams) {
            line = set(instr.targetReg, "params");
        }
        else if (instr instanceof InstrSetPrimCar) {
            line = set(instr.targetReg, `(car %${instr.pairReg})`);
        }
        else if (instr instanceof InstrSetPrimCdr) {
            line = set(instr.targetReg, `(cdr %${instr.pairReg})`);
        }
        else if (instr instanceof InstrSetPrimIdRegSym) {
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
        else if (instr instanceof InstrSetReg) {
            line = set(instr.targetReg, `%${instr.sourceReg}`);
        }
        else if (instr instanceof InstrArgIn) {
            line = "(arg-in)";
        }
        else if (instr instanceof InstrArgNext) {
            line = `(arg-next %${instr.register})`;
        }
        else if (instr instanceof InstrArgMany) {
            line = `(arg-many %${instr.register})`;
        }
        else if (instr instanceof InstrArgOut) {
            line = "(arg-out)";
        }
        else if (instr instanceof InstrSetApply) {
            line = set(instr.targetReg, `(apply %${instr.funcReg})`);
        }
        else if (instr instanceof InstrSetGetGlobal) {
            line = set(instr.targetReg, `(get-global "${instr.name}")`);
        }
        else if (instr instanceof InstrErrIf) {
            line = `(err-if %${instr.testReg} "${instr.errorMessage}")`;
        }
        else if (instr instanceof InstrReturnReg) {
            line = `(return %${instr.returnReg})`;
        }
        else if (instr instanceof InstrJmp) {
            line = `(jmp ${instr.label})`;
        }
        else if (instr instanceof InstrUnlessJmp) {
            line = `(unless-jmp %${instr.testReg} ${instr.label})`;
        }
        else {
            let _coverageCheck: never = instr;
            return _coverageCheck;
        }
        let lineLabel = lines.length;
        if (jumpTargetLines.has(lineLabel)) {
            line = `${String(lineLabel).padStart(3, " ")}: ${line}`;
        }
        else {
            line = " ".repeat(5) + line;
        }
        lines.push(line);
    }
    return lines.join("\n");
}

export function stringifyTarget({ name, header, body }: Target): string {
    let headerDesc = `[req: ${header.req}; reg: ${header.reg}]`;
    return `bcfn ${name} ${headerDesc}` + "\n" + dump(body);
}

