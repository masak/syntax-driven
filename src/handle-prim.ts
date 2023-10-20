import {
    Ast,
    AstQuote,
    AstSymbol,
} from "./source";
import {
    InstrSetPrimCarReg,
    InstrSetPrimCdrReg,
    InstrSetPrimIdRegSym,
    InstrSetPrimTypeReg,
    Register,
} from "./target";
import {
    Context,
} from "./context";

const primNames = ["id", "type", "car", "cdr"];

type PrimName = "id" | "type" | "car" | "cdr";

export function isPrimName(s: string): s is PrimName {
    return primNames.includes(s);
}

const selfQuotingSymbols = new Set(["nil", "t"]);

function qSym(ast: Ast): string | null {
    if (ast instanceof AstSymbol && selfQuotingSymbols.has(ast.name)) {
        return ast.name;
    }
    else if (ast instanceof AstQuote && ast.datum instanceof AstSymbol) {
        return ast.datum.name;
    }
    return null;
}

export function handlePrim(
    opName: PrimName,
    args: Array<Ast>,
    ctx: Context,
    resultRegister: Register | null = null,
    handle: (
        ast: Ast,
        ctx: Context,
        resultRegister?: Register | null,
    ) => Register,
): Register {

    function resultRegOrNextReg() {
        return resultRegister === null
            ? ctx.writer!.nextReg()
            : resultRegister;
    }

    if (opName === "id") {
        if (args.length < 2) {
            throw new Error("Not enough operands for 'id'");
        }
        let r1 = args[0];
        let r2 = args[1];
        let r2Sym = qSym(r2);
        if (!qSym(r1) && r2Sym !== null) {
            let r1r = handle(r1, ctx);
            let targetReg = resultRegOrNextReg();
            ctx.writer!.addInstr(
                new InstrSetPrimIdRegSym(targetReg, r1r, r2Sym)
            );
            return targetReg;
        }
        else {
            throw new Error("Unrecognized _kind_ of 'id' call");
        }
    }
    else if (opName === "type") {
        if (args.length < 1) {
            throw new Error("Not enough operands for 'type'");
        }
        let r1 = args[0];
        let r1r = handle(r1, ctx);
        let targetReg = resultRegOrNextReg();
        ctx.writer!.addInstr(new InstrSetPrimTypeReg(targetReg, r1r));
        return targetReg;
    }
    else if (opName === "car") {
        if (args.length < 1) {
            throw new Error("Not enough operands for 'car'");
        }
        let r1 = args[0];
        let r1r = handle(r1, ctx);
        let targetReg = resultRegOrNextReg();
        ctx.writer!.addInstr(new InstrSetPrimCarReg(targetReg, r1r));
        return targetReg;
    }
    else if (opName === "cdr") {
        if (args.length < 1) {
            throw new Error("Not enough operands for 'cdr'");
        }
        let r1 = args[0];
        let r1r = handle(r1, ctx);
        let targetReg = resultRegOrNextReg();
        ctx.writer!.addInstr(new InstrSetPrimCdrReg(targetReg, r1r));
        return targetReg;
    }
    else {
        let _coverageCheck: never = opName;
        return _coverageCheck;
    }
}

