import {
    Ast,
    AstList,
    AstQuote,
    AstSymbol,
    Source,
} from "./source";
import {
    Env,
} from "./env";
import {
    Instr,
    InstrSetPrimCarReg,
    InstrSetPrimCdrReg,
    InstrSetPrimIdRegSym,
    InstrSetPrimTypeReg,
    InstrArgsStart,
    InstrArgOne,
    InstrArgsEnd,
    InstrJmp,
    InstrJmpUnlessReg,
    InstrSetApply,
    InstrSetGetGlobal,
    InstrSetGetSymbol,
    InstrSetReg,
    InstrReturnReg,
    Register,
    Target,
} from "./target";
import {
    Conf,
    OPT_ALL,
} from "./conf";
import {
    inline,
} from "./inline";

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

const REGISTER_NOT_YET_KNOWN = -1;

export function compile(
    source: Source,
    env: Env,
    conf: Conf = OPT_ALL,
): Target {
    let unusedReg = 0;
    function nextReg(): Register {
        return unusedReg++;
    }

    let instrs: Array<Instr> = [];
    let registerMap: Map<string, Register> = new Map();
    let labelMap: Map<string, number> = new Map();
    let maxReqReg = -1;

    function nextAvailableLabel(prefix: string): string {
        let n = 1;
        while (true) {
            let label = `${prefix}-${n}`;
            if (!labelMap.has(label)) {
                return label;
            }
            n += 1;
        }
    }

    // param handling
    if (source.params instanceof AstList) {
        for (let param of source.params.elems) {
            if (!(param instanceof AstSymbol)) {
                throw new Error("non-symbol parameter -- todo");
            }
            let paramReg = nextReg();
            registerMap.set(param.name, paramReg);
            maxReqReg = paramReg;
        }
    }
    else if (source.params instanceof AstSymbol) {
        throw new Error("rest parameter -- todo");
    }

    // body
    function handle(ast: Ast): Register {
        if (ast instanceof AstSymbol) {
            let name = ast.name;
            if (selfQuotingSymbols.has(name)) {
                let symbolReg = nextReg();
                instrs.push(new InstrSetGetSymbol(symbolReg, name));
                return symbolReg;
            }
            else if (registerMap.has(name)) {
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
            else if (opName === "car") {
                if (args.length < 1) {
                    throw new Error("Not enough operands for 'car'");
                }
                let r1 = args[0];
                let r1r = handle(r1);
                let targetReg = nextReg();
                instrs.push(new InstrSetPrimCarReg(targetReg, r1r));
                return targetReg;
            }
            else if (opName === "cdr") {
                if (args.length < 1) {
                    throw new Error("Not enough operands for 'cdr'");
                }
                let r1 = args[0];
                let r1r = handle(r1);
                let targetReg = nextReg();
                instrs.push(new InstrSetPrimCdrReg(targetReg, r1r));
                return targetReg;
            }
            else if (opName === "if") {
                let fixups: Array<InstrSetReg> = [];
                let ifEndLabel = nextAvailableLabel("if-end");
                for (let i = 0; i < args.length - 1; i += 2) {
                    let test = args[i];
                    let rTest = handle(test);
                    let branchLabel = nextAvailableLabel("if-branch");
                    instrs.push(new InstrJmpUnlessReg(branchLabel, rTest));
                    let consequent = args[i + 1];
                    let rConsequent = handle(consequent);
                    let setReg =
                        new InstrSetReg(REGISTER_NOT_YET_KNOWN, rConsequent);
                    instrs.push(setReg);
                    fixups.push(setReg);
                    instrs.push(new InstrJmp(ifEndLabel));
                    labelMap.set(branchLabel, instrs.length);
                }
                if (args.length % 2 !== 0) {
                    let consequent = args[args.length - 1];
                    let rConsequent = handle(consequent);
                    let setReg =
                        new InstrSetReg(REGISTER_NOT_YET_KNOWN, rConsequent);
                    instrs.push(setReg);
                    fixups.push(setReg);
                }
                labelMap.set(ifEndLabel, instrs.length);

                let resultRegister = nextReg();
                for (let instr of fixups) {
                    instr.targetReg = resultRegister;
                }
                return resultRegister;
            }
            else if (registerMap.has(opName)) {
                let funcReg = registerMap.get(opName)!;
                let argRegs = args.map(handle);
                instrs.push(new InstrArgsStart());
                for (let reg of argRegs) {
                    instrs.push(new InstrArgOne(reg));
                }
                instrs.push(new InstrArgsEnd());
                let targetReg = nextReg();
                instrs.push(new InstrSetApply(targetReg, funcReg));
                return targetReg;
            }
            else if (env.has(opName) || source.name === opName) {
                let argRegs = args.map(handle);
                let targetReg: Register;
                if (env.has(opName) && conf.inlineKnownCalls) {
                    targetReg = inline(
                        env.get(opName), argRegs, instrs, unusedReg
                    );
                    unusedReg = targetReg + 1;
                }
                else {
                    let funcReg = nextReg();
                    instrs.push(new InstrSetGetGlobal(funcReg, opName));
                    instrs.push(new InstrArgsStart());
                    for (let reg of argRegs) {
                        instrs.push(new InstrArgOne(reg));
                    }
                    instrs.push(new InstrArgsEnd());
                    targetReg = nextReg();
                    instrs.push(new InstrSetApply(targetReg, funcReg));
                }
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

    let reqCount = maxReqReg + 1;
    let regCount = returnReg + 1;

    return new Target(
        source.name,
        { reqCount, regCount },
        instrs,
        labelMap,
    );
}

