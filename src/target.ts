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
    InstrJmpIfReg |
    InstrJmpUnlessReg |
    InstrReturnReg |
    InstrSetApply |
    InstrSetGetGlobal |
    InstrSetGetSymbol |
    InstrSetIsStackEmpty |
    InstrSetMakeStack |
    InstrSetPrimCarReg |
    InstrSetPrimCdrReg |
    InstrSetPrimIdRegSym |
    InstrSetPrimTypeReg |
    InstrSetReg |
    InstrSetStackPop |
    InstrStackPush;

export type SetInstr =
    InstrSetApply |
    InstrSetGetGlobal |
    InstrSetGetSymbol |
    InstrSetIsStackEmpty |
    InstrSetMakeStack |
    InstrSetPrimCarReg |
    InstrSetPrimCdrReg |
    InstrSetPrimIdRegSym |
    InstrSetPrimTypeReg |
    InstrSetReg |
    InstrSetStackPop |
    InstrSetStackPop;

type FieldType = "in reg" | "out reg" | "label" | "sym" | "name";

abstract class InstrBase {
    forEachOutReg(fn: (reg: Register) => void): this {
        let fields = instrFields.get(this.constructor)!;
        for (let [fieldName, type] of fields) {
            if (type === "out reg") {
                fn((this as any)[fieldName]);
            }
        }

        return this;
    }

    changeAllRegs(fn: (reg: Register) => Register): this {
        let fields = instrFields.get(this.constructor)!;
        for (let [fieldName, type] of fields) {
            if (type === "in reg" || type === "out reg") {
                (this as any)[fieldName] = fn((this as any)[fieldName]);
            }
        }

        return this;
    }
}

export class InstrSetPrimCarReg extends InstrBase {
    constructor(public targetReg: Register, public objectReg: Register) {
        super();
    }
}

export class InstrSetPrimCdrReg extends InstrBase {
    constructor(public targetReg: Register, public objectReg: Register) {
        super();
    }
}

export class InstrSetPrimIdRegSym extends InstrBase {
    constructor(
        public targetReg: Register,
        public leftReg: Register,
        public rightSym: string,
    ) {
        super();
    }
}

export class InstrSetPrimTypeReg extends InstrBase {
    constructor(public targetReg: Register, public objectReg: Register) {
        super();
    }
}

export class InstrSetReg extends InstrBase {
    constructor(public targetReg: Register, public sourceReg: Register) {
        super();
    }
}

export class InstrArgsStart extends InstrBase {
    constructor() {
        super();
    }
}

export class InstrArgOne extends InstrBase {
    constructor(public register: number) {
        super();
    }
}

export class InstrArgsEnd extends InstrBase {
    constructor() {
        super();
    }
}

export class InstrJmp extends InstrBase {
    constructor(public label: string) {
        super();
    }
}

export class InstrSetApply extends InstrBase {
    constructor(public targetReg: Register, public funcReg: Register) {
        super();
    }
}

export class InstrSetGetGlobal extends InstrBase {
    constructor(public targetReg: Register, public name: string) {
        super();
    }
}

export class InstrSetGetSymbol extends InstrBase {
    constructor(public targetReg: Register, public name: string) {
        super();
    }
}

export class InstrReturnReg extends InstrBase {
    constructor(public returnReg: Register) {
        super();
    }
}

export class InstrJmpIfReg extends InstrBase {
    constructor(public label: string, public testReg: Register) {
        super();
    }
}

export class InstrJmpUnlessReg extends InstrBase {
    constructor(public label: string, public testReg: Register) {
        super();
    }
}

export class InstrSetMakeStack extends InstrBase {
    constructor(public targetReg: Register) {
        super();
    }
}

export class InstrStackPush extends InstrBase {
    constructor(public stackReg: Register, public valueReg: Register) {
        super();
    }
}

export class InstrSetIsStackEmpty extends InstrBase {
    constructor(public targetReg: Register, public stackReg: Register) {
        super();
    }
}

export class InstrSetStackPop extends InstrBase {
    constructor(public targetReg: Register, public stackReg: Register) {
        super();
    }
}

export function isSetInstr(instr: Instr): instr is SetInstr {
    return instr.hasOwnProperty("targetReg");
}

export function cloneInstr<T extends Instr>(instr: T): T {
    let clone = Object.assign(
        Object.create(Object.getPrototypeOf(instr)),
        instr,
    );
    return clone;
}

export const instrFields = new Map<Function, Array<[string, FieldType]>>([
    [InstrSetPrimCarReg, [
        ["targetReg", "out reg"],
        ["objectReg", "in reg"],
    ]],

    [InstrSetPrimCdrReg, [
        ["targetReg", "out reg"],
        ["objectReg", "in reg"],
    ]],

    [InstrSetPrimIdRegSym, [
        ["targetReg", "out reg"],
        ["leftReg", "in reg"],
    ]],

    [InstrSetPrimTypeReg, [
        ["targetReg", "out reg"],
        ["objectReg", "in reg"],
    ]],

    [InstrSetReg, [
        ["targetReg", "out reg"],
        ["sourceReg", "in reg"],
    ]],

    [InstrArgsStart, [
    ]],

    [InstrArgOne, [
        ["register", "in reg"],
    ]],

    [InstrArgsEnd, [
    ]],

    [InstrJmp, [
        ["label", "label"],
    ]],

    [InstrSetApply, [
        ["targetReg", "out reg"],
        ["funcReg", "in reg"],
    ]],

    [InstrSetGetGlobal, [
        ["targetReg", "out reg"],
        ["name", "name"],
    ]],

    [InstrSetGetSymbol, [
        ["targetReg", "out reg"],
        ["name", "sym"],
    ]],

    [InstrReturnReg, [
        ["returnReg", "out reg"],
    ]],

    [InstrJmpIfReg, [
        ["label", "label"],
        ["testReg", "in reg"],
    ]],

    [InstrJmpUnlessReg, [
        ["label", "label"],
        ["testReg", "in reg"],
    ]],

    [InstrSetMakeStack, [
        ["targetReg", "out reg"],
    ]],

    [InstrStackPush, [
        ["stackReg", "in reg"],
        ["valueReg", "in reg"],
    ]],

    [InstrSetIsStackEmpty, [
        ["targetReg", "out reg"],
        ["stackReg", "in reg"],
    ]],

    [InstrSetStackPop, [
        ["targetReg", "out reg"],
        ["stackReg", "in reg"],
    ]],
]);

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
        else if (instr instanceof InstrJmpIfReg) {
            line = `jmp :${instr.label} if %${instr.testReg}`;
        }
        else if (instr instanceof InstrJmpUnlessReg) {
            line = `jmp :${instr.label} unless %${instr.testReg}`;
        }
        else if (instr instanceof InstrSetMakeStack) {
            line = set(instr, "(make-stack)");
        }
        else if (instr instanceof InstrStackPush) {
            line = `(%${instr.stackReg}!push %${instr.valueReg})`;
        }
        else if (instr instanceof InstrSetIsStackEmpty) {
            line = set(instr, `(stack-empty? %${instr.stackReg})`);
        }
        else if (instr instanceof InstrSetStackPop) {
            line = set(instr, `(%${instr.stackReg}!pop)`);
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

