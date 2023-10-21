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
    TargetWriter,
} from "./write-target";
import {
    inline,
} from "./inline";
import {
    Env,
} from "./env";

export function isCall(opName: string, writer: TargetWriter, env: Env) {
    return writer.registerMap.has(opName) ||
        env.has(opName) ||
        writer.sourceName === opName;
}

export function handleCall(
    opName: string,
    args: Array<Ast>,
    writer: TargetWriter,
    env: Env,
    isTailContext: boolean,
    resultRegister: Register | null = null,
    handle: (
        ast: Ast,
        writer: TargetWriter,
        env: Env,
        resultRegister?: Register | null,
    ) => Register,
): Register | null {

    function resultRegOrNextReg(): Register {
        return resultRegister === null
            ? writer.nextReg()
            : resultRegister;
    }

    if (writer.registerMap.has(opName)) {
        let funcReg = writer.registerMap.get(opName)!;
        let argRegs = args.map((a) => handle(a, writer, env));
        writer.addInstr(new InstrArgsStart());
        for (let reg of argRegs) {
            writer.addInstr(new InstrArgOne(reg));
        }
        writer.addInstr(new InstrArgsEnd());
        let targetReg = resultRegOrNextReg();
        writer.addInstr(new InstrSetApply(targetReg, funcReg));
        return targetReg;
    }
    else if (env.has(opName) || writer.sourceName === opName) {
        let targetReg: Register | null;
        if (env.has(opName) && writer.conf.inlineKnownCalls) {
            let argRegs = args.map((a) => {
                let reg = handle(a, writer, env);
                return reg;
            });
            targetReg = inline(env.get(opName), argRegs, writer);
            writer.unusedReg = targetReg + 1;
        }
        else if (writer.sourceName === opName && isTailContext &&
                    writer.conf.eliminateTailSelfCalls) {
            if (writer.sourceParams instanceof AstList) {
                if (args.length !== writer.sourceParams.elems.length) {
                    throw new Error(
                        "Recursive call params/args length mismatch"
                    );
                }
                let index = 0;
                // XXX: This logic is a little bit too simplistic,
                //      as the real logic should take into account
                //      permutations of things; but it will work
                //      for now
                for (let param of writer.sourceParams.elems) {
                    if (!(param instanceof AstSymbol)) {
                        throw new Error("non-symbol parameter -- todo");
                    }
                    let arg = args[index];
                    if (arg instanceof AstSymbol &&
                        arg.name === param.name) {
                        // no need to do anything; arg matches up
                    }
                    else {
                        let paramReg = writer.registerMap.get(param.name)!;
                        handle(arg, writer, env, paramReg);
                    }
                    index += 1;
                }
            }
            else if (writer.sourceParams instanceof AstSymbol) {
                throw new Error("rest parameter -- todo");
            }
            writer.addLabel("top", writer.topIndex);
            writer.addInstr(new InstrJmp("top"));
            targetReg = null;
        }
        else {
            let argRegs = args.map((a) => handle(a, writer, env));
            let funcReg = writer.nextReg();
            writer.addInstr(new InstrSetGetGlobal(funcReg, opName));
            writer.addInstr(new InstrArgsStart());
            for (let reg of argRegs) {
                writer.addInstr(new InstrArgOne(reg));
            }
            writer.addInstr(new InstrArgsEnd());
            targetReg = resultRegOrNextReg();
            writer.addInstr(new InstrSetApply(targetReg, funcReg));
        }
        return targetReg;
    }
    else {
        throw new Error("Precondition failed: not a call after all");
    }
}

