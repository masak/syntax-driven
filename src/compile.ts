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

class Context {
    instrs: Array<Instr> = [];
    unusedReg = 0;
    labelMap = new Map<string, number>();
    registerMap = new Map<string, Register>();
    topIndex = 0;

    constructor(
        public sourceName: string,
        public sourceParams: Ast,
        public env: Env,
        public conf: Conf,
    ) {
    }

    nextReg(): Register {
        return this.unusedReg++;
    }

    nextAvailableLabel(prefix: string) {
        let n = 1;
        while (true) {
            let label = `${prefix}-${n}`;
            if (!this.labelMap.has(label)) {
                return label;
            }
            n += 1;
        }
    }

    setTopIndex() {
        this.topIndex = this.instrs.length;
    }
}

function handle(
    ast: Ast,
    ctx: Context,
    isTailContext: boolean,
    resultRegister = REGISTER_NONE_REQUESTED,
): Register {

    function resultRegOrNextReg() {
        return resultRegister === REGISTER_NONE_REQUESTED
            ? ctx.nextReg()
            : resultRegister;
    }

    if (ast instanceof AstSymbol) {
        let name = ast.name;
        if (selfQuotingSymbols.has(name)) {
            let symbolReg = resultRegOrNextReg();
            ctx.instrs.push(new InstrSetGetSymbol(symbolReg, name));
            return symbolReg;
        }
        else if (ctx.registerMap.has(name)) {
            return ctx.registerMap.get(name)!;
        }
        else if (ctx.env.has(name)) {
            let globalReg = resultRegOrNextReg();
            ctx.instrs.push(new InstrSetGetGlobal(globalReg, name));
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
        else if (opName === "if") {
            let fixups: Array<SetInstr> = [];
            let ifEndLabel = ctx.nextAvailableLabel("if-end");
            for (let i = 0; i < args.length - 1; i += 2) {
                let test = args[i];
                let rTest = handle(test, ctx, false);
                let branchLabel = ctx.nextAvailableLabel("if-branch");
                ctx.instrs.push(new InstrJmpUnlessReg(branchLabel, rTest));
                let consequent = args[i + 1];
                let rConsequent = handle(
                    consequent,
                    ctx,
                    isTailContext,
                    REGISTER_NOT_YET_KNOWN,
                );
                if (rConsequent !== REGISTER_NOT_USED) {
                    let lastInstr = ctx.instrs[ctx.instrs.length - 1];
                    if (!isSetInstr(lastInstr)) {
                        throw new Error(
                            "Not a set instr: " +
                            lastInstr.constructor.name
                        );
                    }
                    fixups.push(lastInstr);
                    ctx.instrs.push(new InstrJmp(ifEndLabel));
                }
                ctx.labelMap.set(branchLabel, ctx.instrs.length);
            }
            if (args.length % 2 !== 0) {
                let consequent = args[args.length - 1];
                let rConsequent = handle(
                    consequent,
                    ctx,
                    isTailContext,
                    REGISTER_NOT_YET_KNOWN,
                );
                if (rConsequent !== REGISTER_NOT_USED) {
                    let lastInstr = ctx.instrs[ctx.instrs.length - 1];
                    if (!isSetInstr(lastInstr)) {
                        throw new Error(
                            "Not a set instr: " +
                            lastInstr.constructor.name
                        );
                    }
                    fixups.push(lastInstr);
                }
            }
            ctx.labelMap.set(ifEndLabel, ctx.instrs.length);

            let resultRegister = resultRegOrNextReg();
            for (let instr of fixups) {
                instr.targetReg = resultRegister;
            }
            return resultRegister;
        }
        else if (ctx.registerMap.has(opName)) {
            let funcReg = ctx.registerMap.get(opName)!;
            let argRegs = args.map((a) => handle(a, ctx, false));
            ctx.instrs.push(new InstrArgsStart());
            for (let reg of argRegs) {
                ctx.instrs.push(new InstrArgOne(reg));
            }
            ctx.instrs.push(new InstrArgsEnd());
            let targetReg = resultRegOrNextReg();
            ctx.instrs.push(new InstrSetApply(targetReg, funcReg));
            return targetReg;
        }
        else if (ctx.env.has(opName) || ctx.sourceName === opName) {
            let targetReg: Register;
            if (ctx.env.has(opName) && ctx.conf.inlineKnownCalls) {
                let argRegs = args.map((a) => handle(a, ctx, false));
                targetReg = inline(
                    ctx.env.get(opName),
                    argRegs,
                    ctx.instrs,
                    ctx.unusedReg,
                );
                ctx.unusedReg = targetReg + 1;
            }
            else if (ctx.sourceName === opName && isTailContext &&
                        ctx.conf.eliminateTailSelfCalls) {
                if (ctx.sourceParams instanceof AstList) {
                    if (args.length !== ctx.sourceParams.elems.length) {
                        throw new Error(
                            "Recursive call params/args length mismatch"
                        );
                    }
                    let index = 0;
                    // XXX: This logic is a little bit too simplistic,
                    //      as the real logic should take into account
                    //      permutations of things; but it will work
                    //      for now
                    for (let param of ctx.sourceParams.elems) {
                        if (!(param instanceof AstSymbol)) {
                            throw new Error("non-symbol parameter -- todo");
                        }
                        let arg = args[index];
                        if (arg instanceof AstSymbol &&
                            arg.name === param.name) {
                            // no need to do anything; arg matches up
                        }
                        else {
                            let paramReg = ctx.registerMap.get(param.name)!;
                            handle(arg, ctx, false, paramReg);
                        }
                        index += 1;
                    }
                }
                else if (ctx.sourceParams instanceof AstSymbol) {
                    throw new Error("rest parameter -- todo");
                }
                ctx.labelMap.set("top", ctx.topIndex);
                ctx.instrs.push(new InstrJmp("top"));
                targetReg = REGISTER_NOT_USED;
            }
            else {
                let argRegs = args.map((a) => handle(a, ctx, false));
                let funcReg = ctx.nextReg();
                ctx.instrs.push(new InstrSetGetGlobal(funcReg, opName));
                ctx.instrs.push(new InstrArgsStart());
                for (let reg of argRegs) {
                    ctx.instrs.push(new InstrArgOne(reg));
                }
                ctx.instrs.push(new InstrArgsEnd());
                targetReg = resultRegOrNextReg();
                ctx.instrs.push(new InstrSetApply(targetReg, funcReg));
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

export function compile(
    source: Source,
    env: Env,
    conf: Conf = OPT_ALL,
): Target {
    let ctx = new Context(source.name, source.params, env, conf);

    let maxReqReg = -1;

    // param handling
    if (source.params instanceof AstList) {
        for (let param of source.params.elems) {
            if (!(param instanceof AstSymbol)) {
                throw new Error("non-symbol parameter -- todo");
            }
            let paramReg = ctx.nextReg();
            ctx.registerMap.set(param.name, paramReg);
            maxReqReg = paramReg;
        }
    }
    else if (source.params instanceof AstSymbol) {
        throw new Error("rest parameter -- todo");
    }

    ctx.setTopIndex();

    // body
    let returnReg = 0;
    let statementIndex = 0;
    for (let statement of source.body) {
        let isTailContext = statementIndex === source.body.length - 1;
        returnReg = handle(statement, ctx, isTailContext);
    }
    ctx.instrs.push(new InstrReturnReg(returnReg));

    let reqCount = maxReqReg + 1;
    let regCount = returnReg + 1;

    return new Target(
        source.name,
        { reqCount, regCount },
        ctx.instrs,
        ctx.labelMap,
    );
}

