export interface Header {
    req: string;
    reg: string;
}

export type Op =
    OpParams |
    OpSetParams |
    OpPrimXar |
    OpPrimXdr |
    OpPrimCar |
    OpPrimCdr |
    OpPrimIdRegSym |
    OpPrimJoinNilNil |
    OpPrimJoinRegNil |
    OpPrimJoinRegReg |
    OpPrimTypeReg |
    OpSetPrimCar |
    OpSetPrimCdr |
    OpSetPrimIdRegSym |
    OpSetPrimJoinNilNil |
    OpSetPrimJoinRegNil |
    OpSetPrimJoinRegReg |
    OpSetPrimTypeReg |
    OpSetReg |
    OpSetSym |
    OpJmp |
    OpIfJmp |
    OpUnlessJmp |
    OpArgIn |
    OpArgNext |
    OpArgMany |
    OpArgOut |
    OpApply |
    OpSetApply |
    OpErrIf |
    OpSetGetGlobal |
    OpReturnReg |
    OpReturnIf |
    OpReturnNilUnless |
    OpReturnTUnless;

export class OpParams {
}

export class OpSetParams {
    constructor(public targetReg: number) {
    }
}

export class OpPrimXar {
}

export class OpPrimXdr {
}

export class OpPrimCar {
}

export class OpPrimCdr {
}

export class OpPrimIdRegSym {
}

export class OpPrimJoinNilNil {
}

export class OpPrimJoinRegNil {
}

export class OpPrimJoinRegReg {
}

export class OpPrimTypeReg {
}

export class OpSetPrimCar {
    constructor(public targetReg: number, public pairReg: number) {
    }
}

export class OpSetPrimCdr {
    constructor(public targetReg: number, public pairReg: number) {
    }
}

export class OpSetPrimIdRegSym {
    constructor(
        public targetReg: number,
        public leftReg: number,
        public rightSym: string,
    ) {
    }
}

export class OpSetPrimJoinNilNil {
}

export class OpSetPrimJoinRegNil {
}

export class OpSetPrimJoinRegReg {
}

export class OpSetPrimTypeReg {
    constructor(public targetReg: number, public objectReg: number) {
    }
}

export class OpSetReg {
    constructor(public targetReg: number, public sourceReg: number) {
    }
}

export class OpSetSym {
    constructor(public targetReg: number, public sym: string) {
    }
}

export class OpJmp {
    constructor(public label: number) {
    }
}

export class OpIfJmp {
}

export class OpUnlessJmp {
    constructor(public testReg: number, public label: number) {
    }
}

export class OpArgIn {
}

export class OpArgNext {
    constructor(public register: number) {
    }
}

export class OpArgMany {
    constructor(public register: number) {
    }
}

export class OpArgOut {
}

export class OpApply {
}

export class OpSetApply {
    constructor(public targetReg: number, public funcReg: number) {
    }
}

export class OpErrIf {
    constructor(public testReg: number, public errorMessage: string) {
    }
}

export class OpSetGetGlobal {
    constructor(public targetReg: number, public name: string) {
    }
}

export class OpReturnReg {
    constructor(public returnReg: number) {
    }
}

export class OpReturnIf {
}

export class OpReturnNilUnless {
}

export class OpReturnTUnless {
}

export class Target {
    constructor(
        public name: string,
        public header: Header,
        public body: Array<Op>,
    ) {
    }
}

function dump(ops: Array<Op>): string {
    function set(targetReg: number, rest: string): string {
        return `%${targetReg} <- ${rest}`;
    }

    let jumpTargetLines = new Set<number>();
    for (let op of ops) {
        if (op instanceof OpJmp) {
            jumpTargetLines.add(op.label);
        }
        else if (op instanceof OpIfJmp) {
            throw new Error("Need to support IfJmp, too");
        }
        else if (op instanceof OpUnlessJmp) {
            jumpTargetLines.add(op.label);
        }
    }
    let lines: Array<string> = [];
    for (let op of ops) {
        let line: string;
        if (op instanceof OpSetParams) {
            line = set(op.targetReg, "params");
        }
        else if (op instanceof OpSetPrimCar) {
            line = set(op.targetReg, `(car %${op.pairReg})`);
        }
        else if (op instanceof OpSetPrimCdr) {
            line = set(op.targetReg, `(cdr %${op.pairReg})`);
        }
        else if (op instanceof OpSetPrimIdRegSym) {
            line = set(op.targetReg, `(id %${op.leftReg} ${op.rightSym})`);
        }
        else if (op instanceof OpSetPrimTypeReg) {
            line = set(op.targetReg, `(type %${op.objectReg})`);
        }
        else if (op instanceof OpSetSym) {
            line = set(op.targetReg, `(sym '${op.sym})`);
        }
        else if (op instanceof OpSetReg) {
            line = set(op.targetReg, `%${op.sourceReg}`);
        }
        else if (op instanceof OpArgIn) {
            line = "(arg-in)";
        }
        else if (op instanceof OpArgNext) {
            line = `(arg-next %${op.register})`;
        }
        else if (op instanceof OpArgMany) {
            line = `(arg-many %${op.register})`;
        }
        else if (op instanceof OpArgOut) {
            line = "(arg-out)";
        }
        else if (op instanceof OpSetApply) {
            line = set(op.targetReg, `(apply %${op.funcReg})`);
        }
        else if (op instanceof OpSetGetGlobal) {
            line = set(op.targetReg, `(get-global "${op.name}")`);
        }
        else if (op instanceof OpErrIf) {
            line = `(err-if %${op.testReg} "${op.errorMessage}")`;
        }
        else if (op instanceof OpReturnReg) {
            line = `(return %${op.returnReg})`;
        }
        else if (op instanceof OpJmp) {
            line = `(jmp ${op.label})`;
        }
        else if (op instanceof OpUnlessJmp) {
            line = `(unless-jmp %${op.testReg} ${op.label})`;
        }
        else {
            throw new Error(`Unrecognized op (in dump): ${op.constructor.name}`);
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

