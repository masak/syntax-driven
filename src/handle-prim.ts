import {
    Ast,
    AstQuote,
    AstSymbol,
} from "./source";
import {
    Instr,
    InstrSetPrimCarReg,
    InstrSetPrimCdrReg,
    InstrSetPrimIdRegSym,
    InstrSetPrimTypeReg,
    Register,
} from "./target";
import {
    TargetWriter,
} from "./write-target";
import {
    Env,
} from "./env";

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
    writer: TargetWriter,
    env: Env,
    resultRegister: Register | null = null,
    handle: (
        ast: Ast,
        writer: TargetWriter,
        env: Env,
        resultRegister?: Register | null,
    ) => Register,
): Register {

    function resultRegOrNextReg() {
        return resultRegister === null
            ? writer.nextReg()
            : resultRegister;
    }

    function handlePrim(
        primName: string,
        instrType: new (targetReg: Register, r1r: Register) => Instr,
    ) {
        if (args.length < 1) {
            throw new Error(`Not enough operands for '${primName}'`);
        }
        let r1 = args[0];
        let r1r = handle(r1, writer, env);
        let targetReg = resultRegOrNextReg();
        writer.addInstr(new instrType(targetReg, r1r));
        return targetReg;
    }

    if (opName === "id") {
        if (args.length < 2) {
            throw new Error("Not enough operands for 'id'");
        }
        let r1 = args[0];
        let r2 = args[1];
        let r2Sym = qSym(r2);
        if (!qSym(r1) && r2Sym !== null) {
            let r1r = handle(r1, writer, env);
            let targetReg = resultRegOrNextReg();
            writer.addInstr(
                new InstrSetPrimIdRegSym(targetReg, r1r, r2Sym)
            );
            return targetReg;
        }
        else {
            throw new Error("Unrecognized _kind_ of 'id' call");
        }
    }
    else if (opName === "type") {
        return handlePrim("type", InstrSetPrimTypeReg);
    }
    else if (opName === "car") {
        return handlePrim("car", InstrSetPrimCarReg);
    }
    else if (opName === "cdr") {
        return handlePrim("cdr", InstrSetPrimCdrReg);
    }
    else {
        let _coverageCheck: never = opName;
        return _coverageCheck;
    }
}

