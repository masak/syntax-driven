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
    Op,
    OpSetParams,
    OpSetPrimCar,
    OpSetPrimCdr,
    OpSetPrimIdRegSym,
    OpSetPrimTypeReg,
    OpSetReg,
    OpSetSym,
    OpJmp,
    OpUnlessJmp,
    OpArgIn,
    OpArgNext,
    OpArgMany,
    OpArgOut,
    OpSetApply,
    OpErrIf,
    OpSetGetGlobal,
    OpReturnReg,
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

const NOT_YET_KNOWN = -1;

export function compile(source: Source, env: Env): Target {
    let unusedReg = 0;
    function nextReg(): number {
        return unusedReg++;
    }

    let ops: Array<Op> = [];
    let registerMap: Map<string, Register> = new Map();
    // param handling
    if (source.params instanceof AstList) {
        let currentReg = nextReg();
        ops.push(new OpSetParams(currentReg));
        for (let param of source.params.elems) {
            if (!(param instanceof AstSymbol)) {
                throw new Error("non-symbol parameter -- todo");
            }
            let paramReg = nextReg();
            registerMap.set(param.name, paramReg);
            ops.push(new OpSetPrimCar(paramReg, currentReg));
            let cdrReg = nextReg();
            ops.push(new OpSetPrimCdr(cdrReg, currentReg));
            currentReg = cdrReg;
        }
        ops.push(new OpErrIf(currentReg, "overargs"));
    }
    else if (source.params instanceof AstSymbol) {
        let paramReg = nextReg();
        ops.push(new OpSetParams(paramReg));
        registerMap.set(source.params.name, paramReg);
    }

    // body
    function handle(ast: Ast): Register {
        if (ast instanceof AstSymbol && qSym(ast) !== null) {
            let sym = qSym(ast)!;
            let symReg = nextReg();
            ops.push(new OpSetSym(symReg, sym));
            return symReg;
        }
        else if (ast instanceof AstSymbol) {
            let name = ast.name;
            if (registerMap.has(name)) {
                return registerMap.get(name)!;
            }
            else if (env.has(name)) {
                let globalReg = nextReg();
                ops.push(new OpSetGetGlobal(globalReg, name));
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
                    ops.push(new OpSetPrimIdRegSym(targetReg, r1r, r2Sym));
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
                ops.push(new OpSetPrimTypeReg(targetReg, r1r));
                return targetReg;
            }
            else if (opName === "car") {
                if (args.length < 1) {
                    throw new Error("Not enough operands for 'car'");
                }
                let r1 = args[0];
                let r1r = handle(r1);
                let targetReg = nextReg();
                ops.push(new OpSetPrimCar(targetReg, r1r));
                return targetReg;
            }
            else if (opName === "cdr") {
                if (args.length < 1) {
                    throw new Error("Not enough operands for 'cdr'");
                }
                let r1 = args[0];
                let r1r = handle(r1);
                let targetReg = nextReg();
                ops.push(new OpSetPrimCdr(targetReg, r1r));
                return targetReg;
            }
            else if (opName === "if") {
                let registerFixupIndices = [];
                let endJumpFixupIndices = [];
                for (let i = 0; i < args.length - 1; i += 2) {
                    let test = args[i];
                    let rTest = handle(test);
                    let nextJumpFixupIndex = ops.length;
                    ops.push(new OpUnlessJmp(rTest, NOT_YET_KNOWN));
                    let consequent = args[i + 1];
                    let rConsequent = handle(consequent);
                    let registerFixupIndex = ops.length;
                    registerFixupIndices.push(registerFixupIndex);
                    ops.push(new OpSetReg(NOT_YET_KNOWN, rConsequent));
                    let endJumpFixupIndex = ops.length;
                    endJumpFixupIndices.push(endJumpFixupIndex);
                    ops.push(new OpJmp(NOT_YET_KNOWN));
                    let nextJumpIndex = ops.length;
                    ops[nextJumpFixupIndex] =
                        new OpUnlessJmp(rTest, nextJumpIndex);
                }
                if (args.length % 2 !== 0) {
                    let consequent = args[args.length - 1];
                    let rConsequent = handle(consequent);
                    let registerFixupIndex = ops.length;
                    registerFixupIndices.push(registerFixupIndex);
                    ops.push(new OpSetReg(NOT_YET_KNOWN, rConsequent));
                }
                let resultRegister = nextReg();
                for (let index of registerFixupIndices) {
                    let instr = ops[index];
                    if (!(instr instanceof OpSetReg)) {
                        throw new Error("Invariant broken: not a SetReg");
                    }
                    instr.targetReg = resultRegister;
                }
                let endIndex = ops.length;
                for (let index of endJumpFixupIndices) {
                    ops[index] = new OpJmp(endIndex);
                }
                return resultRegister;
            }
            else if (opName === "apply") {
                if (args.length < 2) {
                    throw new Error("Not enough operands for 'apply'");
                }
                let [func, ...applyArgs] = args;
                let firstArgs = applyArgs.slice(0, applyArgs.length - 1);
                let lastArg = applyArgs[applyArgs.length - 1];
                let rFunc = handle(func);
                let rFirstArgs = firstArgs.map(handle);
                let rLastArg = handle(lastArg);
                ops.push(new OpArgIn());
                for (let reg of rFirstArgs) {
                    ops.push(new OpArgNext(reg));
                }
                ops.push(new OpArgMany(rLastArg));
                ops.push(new OpArgOut());
                let targetReg = nextReg();
                ops.push(new OpSetApply(targetReg, rFunc));
                return targetReg;
            }
            else if (registerMap.has(opName)) {
                let funcReg = registerMap.get(opName)!;
                let argRegs = args.map(handle);
                ops.push(new OpArgIn());
                for (let reg of argRegs) {
                    ops.push(new OpArgNext(reg));
                }
                ops.push(new OpArgOut());
                let targetReg = nextReg();
                ops.push(new OpSetApply(targetReg, funcReg));
                return targetReg;
            }
            else if (env.has(opName)) {
                let funcReg = nextReg();
                ops.push(new OpSetGetGlobal(funcReg, opName));
                let argRegs = args.map(handle);
                ops.push(new OpArgIn());
                for (let reg of argRegs) {
                    ops.push(new OpArgNext(reg));
                }
                ops.push(new OpArgOut());
                let targetReg = nextReg();
                ops.push(new OpSetApply(targetReg, funcReg));
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
    ops.push(new OpReturnReg(returnReg));

    let reqHigh = source.params instanceof AstList
        ? source.params.elems.length - 1
        : 0;

    return new Target(
        source.name,
        { req: `%0..%${reqHigh}`, reg: `%0..%${unusedReg - 1}` },
        ops,
    );
}

