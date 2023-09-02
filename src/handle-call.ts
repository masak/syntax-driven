import {
    Ast,
    AstList,
    AstSymbol,
} from "./source";
import {
    InstrArgOne,
    InstrArgsEnd,
    InstrArgsStart,
    InstrJmp,
    InstrSetApply,
    InstrSetGetGlobal,
    Register,
} from "./target";
import {
    Context,
} from "./context";
import {
    inline,
} from "./inline";

export function isCall(opName: string, ctx: Context) {
    return ctx.registerMap.has(opName) ||
        ctx.env.has(opName) ||
        ctx.sourceName === opName;
}

export function handleCall(
    opName: string,
    args: Array<Ast>,
    ctx: Context,
    isTailContext: boolean,
    resultRegister: Register | null = null,
    handle: (
        ast: Ast,
        ctx: Context,
        resultRegister?: Register | null,
    ) => Register,
): Register | null {

    function resultRegOrNextReg() {
        return resultRegister === null
            ? ctx.nextReg()
            : resultRegister;
    }

    if (ctx.registerMap.has(opName)) {
        let funcReg = ctx.registerMap.get(opName)!;
        let argRegs = args.map((a) => handle(a, ctx));
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
        let targetReg: Register | null;
        if (ctx.env.has(opName) && ctx.conf.inlineKnownCalls) {
            let argRegs = args.map((a) => {
                let reg = handle(a, ctx);
                return reg;
            });
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
                        handle(arg, ctx, paramReg);
                    }
                    index += 1;
                }
            }
            else if (ctx.sourceParams instanceof AstSymbol) {
                throw new Error("rest parameter -- todo");
            }
            ctx.labelMap.set("top", ctx.topIndex);
            ctx.instrs.push(new InstrJmp("top"));
            targetReg = null;
        }
        else {
            let argRegs = args.map((a) => handle(a, ctx));
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
        throw new Error("Precondition failed: not a call after all");
    }
}

