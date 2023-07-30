import {
    Source,
} from "./source";
import {
    Env,
} from "./env";
import {
    Ast,
    AstList,
    AstQuote,
    AstSymbol,
} from "./parse-source";
import {
    Instr,
    InstrSetParams,
    InstrSetPrimCar,
    InstrSetPrimCdr,
    InstrSetPrimIdRegSym,
    InstrSetPrimTypeReg,
    InstrSetSym,
    InstrArgIn,
    InstrArgNext,
    InstrArgOut,
    InstrSetApply,
    InstrErrIf,
    InstrSetGetGlobal,
    InstrReturnReg,
    Target,
} from "./target";

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

type Register = number;

export function compile(source: Source, env: Env): Target {
    let unusedReg = 0;
    function nextReg(): number {
        return unusedReg++;
    }

    let instrs: Array<Instr> = [];
    let registerMap: Map<string, Register> = new Map();
    // param handling
    if (source.params instanceof AstList) {
        let currentReg = nextReg();
        instrs.push(new InstrSetParams(currentReg));
        for (let param of source.params.elems) {
            if (!(param instanceof AstSymbol)) {
                throw new Error("non-symbol parameter -- todo");
            }
            let paramReg = nextReg();
            registerMap.set(param.name, paramReg);
            instrs.push(new InstrSetPrimCar(paramReg, currentReg));
            let cdrReg = nextReg();
            instrs.push(new InstrSetPrimCdr(cdrReg, currentReg));
            currentReg = cdrReg;
        }
        instrs.push(new InstrErrIf(currentReg, "overargs"));
    }
    else if (source.params instanceof AstSymbol) {
        let paramReg = nextReg();
        instrs.push(new InstrSetParams(paramReg));
        registerMap.set(source.params.name, paramReg);
    }

    // body
    function handle(ast: Ast): Register {
        if (ast instanceof AstSymbol && qSym(ast) !== null) {
            let sym = qSym(ast)!;
            let symReg = nextReg();
            instrs.push(new InstrSetSym(symReg, sym));
            return symReg;
        }
        else if (ast instanceof AstSymbol) {
            let name = ast.name;
            if (registerMap.has(name)) {
                return registerMap.get(name)!;
            }
            else if (env.has(name)) {
                let globalReg = nextReg();
                instrs.push(new InstrSetGetGlobal(globalReg, name));
                return globalReg;
            }
            throw new Error(`Unrecognized variable: '${name}'`);
        }
        else if (ast instanceof AstList) {
            if (ast.elems.length === 0) {
                throw new Error("Empty lists not allowed");
            }
            let operator = ast.elems[0];
            if (!(operator instanceof AstSymbol)) {
                throw new Error("Non-symbolic operator -- todo");
            }
            let opName = operator.name;
            let args = ast.elems.slice(1);
            if (opName === "id") {
                if (args.length < 2) {
                    throw new Error("Not enough operands for 'id'");
                }
                let r1 = args[0];
                let r2 = args[1];
                let r2Sym = qSym(r2);
                if (!qSym(r1) && r2Sym !== null) {
                    let r1r = handle(r1);
                    let targetReg = nextReg();
                    instrs.push(
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
                let r1r = handle(r1);
                let targetReg = nextReg();
                instrs.push(new InstrSetPrimTypeReg(targetReg, r1r));
                return targetReg;
            }
            else if (registerMap.has(opName)) {
                let funcReg = registerMap.get(opName)!;
                let argRegs = args.map(handle);
                instrs.push(new InstrArgIn());
                for (let reg of argRegs) {
                    instrs.push(new InstrArgNext(reg));
                }
                instrs.push(new InstrArgOut());
                let targetReg = nextReg();
                instrs.push(new InstrSetApply(targetReg, funcReg));
                return targetReg;
            }
            else if (env.has(opName)) {
                let funcReg = nextReg();
                instrs.push(new InstrSetGetGlobal(funcReg, opName));
                let argRegs = args.map(handle);
                instrs.push(new InstrArgIn());
                for (let reg of argRegs) {
                    instrs.push(new InstrArgNext(reg));
                }
                instrs.push(new InstrArgOut());
                let targetReg = nextReg();
                instrs.push(new InstrSetApply(targetReg, funcReg));
                return targetReg;
            }
            else {
                throw new Error(`Unknown operator name '${operator.name}'`);
            }
        }
        else {
            throw new Error(`Unrecognized AST type ${ast.constructor.name}`);
        }
    }

    let returnReg = 0;
    for (let statement of source.body) {
        returnReg = handle(statement);
    }
    instrs.push(new InstrReturnReg(returnReg));

    let reqHigh = source.params instanceof AstList
        ? source.params.elems.length - 1
        : 0;

    return new Target(
        source.name,
        { req: `%0..%${reqHigh}`, reg: `%0..%${unusedReg - 1}` },
        instrs,
    );
}

