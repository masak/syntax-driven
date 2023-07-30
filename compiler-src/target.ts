export interface Header {
    req: string;
    reg: string;
}

export type Op =
    Op.Params |
    Op.SetParams |
    Op.PrimXar |
    Op.PrimXdr |
    Op.PrimCar |
    Op.PrimCdr |
    Op.PrimIdRegSym |
    Op.PrimJoinNilNil |
    Op.PrimJoinRegNil |
    Op.PrimJoinRegReg |
    Op.PrimTypeReg |
    Op.SetPrimCar |
    Op.SetPrimCdr |
    Op.SetPrimIdRegSym |
    Op.SetPrimJoinNilNil |
    Op.SetPrimJoinRegNil |
    Op.SetPrimJoinRegReg |
    Op.SetPrimTypeReg |
    Op.SetReg |
    Op.SetSym |
    Op.Jmp |
    Op.IfJmp |
    Op.UnlessJmp |
    Op.ArgIn |
    Op.ArgNext |
    Op.ArgMany |
    Op.ArgOut |
    Op.Apply |
    Op.SetApply |
    Op.ErrIf |
    Op.SetGetGlobal |
    Op.ReturnReg |
    Op.ReturnIf |
    Op.ReturnNilUnless |
    Op.ReturnTUnless;

export namespace Op {
    export class Params {
    }

    export class SetParams {
        constructor(public targetReg: number) {
        }
    }

    export class PrimXar {
    }

    export class PrimXdr {
    }

    export class PrimCar {
    }

    export class PrimCdr {
    }

    export class PrimIdRegSym {
    }

    export class PrimJoinNilNil {
    }

    export class PrimJoinRegNil {
    }

    export class PrimJoinRegReg {
    }

    export class PrimTypeReg {
    }

    export class SetPrimCar {
        constructor(public targetReg: number, public pairReg: number) {
        }
    }

    export class SetPrimCdr {
        constructor(public targetReg: number, public pairReg: number) {
        }
    }

    export class SetPrimIdRegSym {
        constructor(
            public targetReg: number,
            public leftReg: number,
            public rightSym: string,
        ) {
        }
    }

    export class SetPrimJoinNilNil {
    }

    export class SetPrimJoinRegNil {
    }

    export class SetPrimJoinRegReg {
    }

    export class SetPrimTypeReg {
        constructor(public targetReg: number, public objectReg: number) {
        }
    }

    export class SetReg {
        constructor(public targetReg: number, public sourceReg: number) {
        }
    }

    export class SetSym {
        constructor(public targetReg: number, public sym: string) {
        }
    }

    export class Jmp {
        constructor(public label: number) {
        }
    }

    export class IfJmp {
    }

    export class UnlessJmp {
        constructor(public testReg: number, public label: number) {
        }
    }

    export class ArgIn {
    }

    export class ArgNext {
        constructor(public register: number) {
        }
    }

    export class ArgMany {
        constructor(public register: number) {
        }
    }

    export class ArgOut {
    }

    export class Apply {
    }

    export class SetApply {
        constructor(public targetReg: number, public funcReg: number) {
        }
    }

    export class ErrIf {
        constructor(public testReg: number, public errorMessage: string) {
        }
    }

    export class SetGetGlobal {
        constructor(public targetReg: number, public name: string) {
        }
    }

    export class ReturnReg {
        constructor(public returnReg: number) {
        }
    }

    export class ReturnIf {
    }

    export class ReturnNilUnless {
    }

    export class ReturnTUnless {
    }
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
        if (op instanceof Op.Jmp) {
            jumpTargetLines.add(op.label);
        }
        else if (op instanceof Op.IfJmp) {
            throw new Error("Need to support IfJmp, too");
        }
        else if (op instanceof Op.UnlessJmp) {
            jumpTargetLines.add(op.label);
        }
    }
    let lines: Array<string> = [];
    for (let op of ops) {
        let line: string;
        if (op instanceof Op.SetParams) {
            line = set(op.targetReg, "params");
        }
        else if (op instanceof Op.SetPrimCar) {
            line = set(op.targetReg, `(car %${op.pairReg})`);
        }
        else if (op instanceof Op.SetPrimCdr) {
            line = set(op.targetReg, `(cdr %${op.pairReg})`);
        }
        else if (op instanceof Op.SetPrimIdRegSym) {
            line = set(op.targetReg, `(id %${op.leftReg} ${op.rightSym})`);
        }
        else if (op instanceof Op.SetPrimTypeReg) {
            line = set(op.targetReg, `(type %${op.objectReg})`);
        }
        else if (op instanceof Op.SetSym) {
            line = set(op.targetReg, `(sym '${op.sym})`);
        }
        else if (op instanceof Op.SetReg) {
            line = set(op.targetReg, `%${op.sourceReg}`);
        }
        else if (op instanceof Op.ArgIn) {
            line = "(arg-in)";
        }
        else if (op instanceof Op.ArgNext) {
            line = `(arg-next %${op.register})`;
        }
        else if (op instanceof Op.ArgMany) {
            line = `(arg-many %${op.register})`;
        }
        else if (op instanceof Op.ArgOut) {
            line = "(arg-out)";
        }
        else if (op instanceof Op.SetApply) {
            line = set(op.targetReg, `(apply %${op.funcReg})`);
        }
        else if (op instanceof Op.SetGetGlobal) {
            line = set(op.targetReg, `(get-global "${op.name}")`);
        }
        else if (op instanceof Op.ErrIf) {
            line = `(err-if %${op.testReg} "${op.errorMessage}")`;
        }
        else if (op instanceof Op.ReturnReg) {
            line = `(return %${op.returnReg})`;
        }
        else if (op instanceof Op.Jmp) {
            line = `(jmp ${op.label})`;
        }
        else if (op instanceof Op.UnlessJmp) {
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

