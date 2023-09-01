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
} from "./compile-context";
import {
    handle,
} from "./compile";

export const primNames = ["id", "type", "car", "cdr"];

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
    opName: string,
    args: Array<Ast>,
    ctx: Context,
    resultRegister: Register | null = null,
): Register {

    function resultRegOrNextReg() {
        return resultRegister === null
            ? ctx.nextReg()
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
            let r1r = handle(r1, ctx, false);
            let targetReg = resultRegOrNextReg();
            ctx.instrs.push(
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
        let r1r = handle(r1, ctx, false);
        let targetReg = resultRegOrNextReg();
        ctx.instrs.push(new InstrSetPrimTypeReg(targetReg, r1r));
        return targetReg;
    }
    else if (opName === "car") {
        if (args.length < 1) {
            throw new Error("Not enough operands for 'car'");
        }
        let r1 = args[0];
        let r1r = handle(r1, ctx, false);
        let targetReg = resultRegOrNextReg();
        ctx.instrs.push(new InstrSetPrimCarReg(targetReg, r1r));
        return targetReg;
    }
    else if (opName === "cdr") {
        if (args.length < 1) {
            throw new Error("Not enough operands for 'cdr'");
        }
        let r1 = args[0];
        let r1r = handle(r1, ctx, false);
        let targetReg = resultRegOrNextReg();
        ctx.instrs.push(new InstrSetPrimCdrReg(targetReg, r1r));
        return targetReg;
    }
    else {
        throw new Error(`Unknown prim operator name '${opName}'`);
    }
}

