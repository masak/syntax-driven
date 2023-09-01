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
    InstrReturnReg,
    isSetInstr,
    Register,
    SetInstr,
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
const REGISTER_NOT_USED = -2;
const REGISTER_NONE_REQUESTED = -3;

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

    let topIndex = instrs.length;

    // body
    function handle(
        ast: Ast,
        isTailContext: boolean,
        resultRegister = REGISTER_NONE_REQUESTED,
    ): Register {

        function resultRegOrNextReg() {
            return resultRegister === REGISTER_NONE_REQUESTED
                ? nextReg()
                : resultRegister;
        }

        if (ast instanceof AstSymbol) {
            let name = ast.name;
            if (selfQuotingSymbols.has(name)) {
                let symbolReg = resultRegOrNextReg();
                instrs.push(new InstrSetGetSymbol(symbolReg, name));
                return symbolReg;
            }
            else if (registerMap.has(name)) {
                return registerMap.get(name)!;
            }
            else if (env.has(name)) {
                let globalReg = resultRegOrNextReg();
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
                    let r1r = handle(r1, false);
                    let targetReg = resultRegOrNextReg();
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
                let r1r = handle(r1, false);
                let targetReg = resultRegOrNextReg();
                instrs.push(new InstrSetPrimTypeReg(targetReg, r1r));
                return targetReg;
            }
            else if (opName === "car") {
                if (args.length < 1) {
                    throw new Error("Not enough operands for 'car'");
                }
                let r1 = args[0];
                let r1r = handle(r1, false);
                let targetReg = resultRegOrNextReg();
                instrs.push(new InstrSetPrimCarReg(targetReg, r1r));
                return targetReg;
            }
            else if (opName === "cdr") {
                if (args.length < 1) {
                    throw new Error("Not enough operands for 'cdr'");
                }
                let r1 = args[0];
                let r1r = handle(r1, false);
                let targetReg = resultRegOrNextReg();
                instrs.push(new InstrSetPrimCdrReg(targetReg, r1r));
                return targetReg;
            }
            else if (opName === "if") {
                let fixups: Array<SetInstr> = [];
                let ifEndLabel = nextAvailableLabel("if-end");
                for (let i = 0; i < args.length - 1; i += 2) {
                    let test = args[i];
                    let rTest = handle(test, false);
                    let branchLabel = nextAvailableLabel("if-branch");
                    instrs.push(new InstrJmpUnlessReg(branchLabel, rTest));
                    let consequent = args[i + 1];
                    let rConsequent = handle(
                        consequent,
                        isTailContext,
                        REGISTER_NOT_YET_KNOWN,
                    );
                    if (rConsequent !== REGISTER_NOT_USED) {
                        let lastInstr = instrs[instrs.length - 1];
                        if (!isSetInstr(lastInstr)) {
                            throw new Error(
                                "Not a set instr: " +
                                lastInstr.constructor.name
                            );
                        }
                        fixups.push(lastInstr);
                        instrs.push(new InstrJmp(ifEndLabel));
                    }
                    labelMap.set(branchLabel, instrs.length);
                }
                if (args.length % 2 !== 0) {
                    let consequent = args[args.length - 1];
                    let rConsequent = handle(
                        consequent,
                        isTailContext,
                        REGISTER_NOT_YET_KNOWN,
                    );
                    if (rConsequent !== REGISTER_NOT_USED) {
                        let lastInstr = instrs[instrs.length - 1];
                        if (!isSetInstr(lastInstr)) {
                            throw new Error(
                                "Not a set instr: " +
                                lastInstr.constructor.name
                            );
                        }
                        fixups.push(lastInstr);
                    }
                }
                labelMap.set(ifEndLabel, instrs.length);

                let resultRegister = resultRegOrNextReg();
                for (let instr of fixups) {
                    instr.targetReg = resultRegister;
                }
                return resultRegister;
            }
            else if (registerMap.has(opName)) {
                let funcReg = registerMap.get(opName)!;
                let argRegs = args.map((a) => handle(a, false));
                instrs.push(new InstrArgsStart());
                for (let reg of argRegs) {
                    instrs.push(new InstrArgOne(reg));
                }
                instrs.push(new InstrArgsEnd());
                let targetReg = resultRegOrNextReg();
                instrs.push(new InstrSetApply(targetReg, funcReg));
                return targetReg;
            }
            else if (env.has(opName) || source.name === opName) {
                let targetReg: Register;
                if (env.has(opName) && conf.inlineKnownCalls) {
                    let argRegs = args.map((a) => handle(a, false));
                    targetReg = inline(
                        env.get(opName), argRegs, instrs, unusedReg
                    );
                    unusedReg = targetReg + 1;
                }
                else if (source.name === opName && isTailContext &&
                            conf.eliminateTailSelfCalls) {
                    if (source.params instanceof AstList) {
                        if (args.length !== source.params.elems.length) {
                            throw new Error(
                                "Recursive call params/args length mismatch"
                            );
                        }
                        let index = 0;
                        // XXX: This logic is a little bit too simplistic,
                        //      as the real logic should take into account
                        //      permutations of things; but it will work
                        //      for now
                        for (let param of source.params.elems) {
                            if (!(param instanceof AstSymbol)) {
                                throw new Error("non-symbol parameter -- todo");
                            }
                            let arg = args[index];
                            if (arg instanceof AstSymbol &&
                                arg.name === param.name) {
                                // no need to do anything; arg matches up
                            }
                            else {
                                let paramReg = registerMap.get(param.name)!;
                                handle(arg, false, paramReg);
                            }
                            index += 1;
                        }
                    }
                    else if (source.params instanceof AstSymbol) {
                        throw new Error("rest parameter -- todo");
                    }
                    labelMap.set("top", topIndex);
                    instrs.push(new InstrJmp("top"));
                    targetReg = REGISTER_NOT_USED;
                }
                else {
                    let argRegs = args.map((a) => handle(a, false));
                    let funcReg = nextReg();
                    instrs.push(new InstrSetGetGlobal(funcReg, opName));
                    instrs.push(new InstrArgsStart());
                    for (let reg of argRegs) {
                        instrs.push(new InstrArgOne(reg));
                    }
                    instrs.push(new InstrArgsEnd());
                    targetReg = resultRegOrNextReg();
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
    let statementIndex = 0;
    for (let statement of source.body) {
        let isTailContext = statementIndex === source.body.length - 1;
        returnReg = handle(statement, isTailContext);
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

