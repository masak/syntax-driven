import {
    Ast,
    AstList,
    AstSymbol,
    Source,
} from "./source";
import {
    Env,
} from "./env";
import {
    InstrSetGetGlobal,
    InstrSetGetSymbol,
    InstrSetReg,
    InstrReturnReg,
    isSetInstr,
    Register,
    Target,
} from "./target";
import {
    Conf,
    OPT_ALL,
} from "./conf";
import {
    Context,
} from "./context";
import {
    handlePrim,
    isPrimName,
} from "./handle-prim";
import {
    handleControl,
    isControlName,
} from "./handle-control";
import {
    handleCall,
    isCall,
} from "./handle-call";

const selfQuotingSymbols = new Set(["nil", "t"]);

function handlePossiblyTail(
    ast: Ast,
    ctx: Context,
    isTailContext: boolean,
    resultRegister: Register | null = null,
): Register | null {

    function resultRegOrNextReg() {
        return resultRegister === null
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
            let localReg = ctx.registerMap.get(name)!;
            if (resultRegister !== null) {
                ctx.instrs.push(new InstrSetReg(resultRegister, localReg));
                return resultRegister;
            }
            return localReg;
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
        if (isPrimName(opName)) {
            return handlePrim(
                opName,
                args,
                ctx,
                resultRegister,
                handle,
            );
        }
        else if (isControlName(opName)) {
            return handleControl(
                opName,
                args,
                ctx,
                isTailContext,
                resultRegister,
                handle,
                handlePossiblyTail,
            );
        }
        else if (isCall(opName, ctx)) {
            return handleCall(
                opName,
                args,
                ctx,
                isTailContext,
                resultRegister,
                handle,
            );
        }
        else {
            throw new Error(`Unknown operator name '${operator.name}'`);
        }
    }
    else {
        throw new Error(`Unrecognized AST type ${ast.constructor.name}`);
    }
}

export function handle(
    ast: Ast,
    ctx: Context,
    resultRegister: Register | null = null,
): Register {
    let isTailContext = false;
    let register = handlePossiblyTail(ast, ctx, isTailContext, resultRegister);
    if (register === null) {
        throw new Error("Precondition failed: null register");
    }
    return register;
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
    let returnReg: Register | null = 0;
    let statementIndex = 0;
    for (let statement of source.body) {
        let isTailContext = statementIndex === source.body.length - 1;
        returnReg = handlePossiblyTail(statement, ctx, isTailContext);
        if (returnReg === null) {
            break;
        }
    }
    if (returnReg !== null) {
        ctx.instrs.push(new InstrReturnReg(returnReg));
    }

    let reqCount = maxReqReg + 1;
    let regCount = Math.max(
        ...ctx.instrs.filter(isSetInstr).map((i) => i.targetReg)
    ) + 1;

    return new Target(
        source.name,
        { reqCount, regCount },
        ctx.instrs,
        ctx.labelMap,
    );
}

