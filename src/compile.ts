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
    Register,
    Target,
} from "./target";
import {
    Conf,
    OPT_ALL,
} from "./conf";
import {
    TargetWriter,
} from "./write-target";
import {
    taba,
} from "./taba";
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
    writer: TargetWriter,
    env: Env,
    isTailContext: boolean,
    resultRegister: Register | null = null,
): Register | null {

    function resultRegOrNextReg() {
        return resultRegister === null
            ? writer.nextReg()
            : resultRegister;
    }

    if (ast instanceof AstSymbol) {
        let name = ast.name;
        if (selfQuotingSymbols.has(name)) {
            let symbolReg = resultRegOrNextReg();
            writer.addInstr(new InstrSetGetSymbol(symbolReg, name));
            return symbolReg;
        }
        else if (writer.registerMap.has(name)) {
            let localReg = writer.registerMap.get(name)!;
            if (resultRegister !== null) {
                writer.addInstr(new InstrSetReg(resultRegister, localReg));
                return resultRegister;
            }
            return localReg;
        }
        else if (env.has(name)) {
            let globalReg = resultRegOrNextReg();
            writer.addInstr(new InstrSetGetGlobal(globalReg, name));
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
                writer,
                env,
                resultRegister,
                handle,
            );
        }
        else if (isControlName(opName)) {
            return handleControl(
                opName,
                args,
                writer,
                env,
                isTailContext,
                resultRegister,
                handle,
                handlePossiblyTail,
            );
        }
        else if (isCall(opName, writer, env)) {
            return handleCall(
                opName,
                args,
                writer,
                env,
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
    writer: TargetWriter,
    env: Env,
    resultRegister: Register | null = null,
): Register {
    let isTailContext = false;
    let register = handlePossiblyTail(
        ast,
        writer,
        env,
        isTailContext,
        resultRegister,
    );
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
    let writer = new TargetWriter(
        source.name,
        source.params,
        conf,
    );

    writer.setTopIndex();

    // body
    if (source.body.length !== 1) {
        throw new Error(`Can't handle body of non-1 length`);
    }
    let statement = source.body[0];
    let isTailContext = true;
    let returnReg: Register | null = handlePossiblyTail(
        statement,
        writer,
        env,
        isTailContext,
    );
    if (returnReg !== null) {
        writer.addInstr(new InstrReturnReg(returnReg));
    }

    let target = writer.target();

    return (conf.eliminateSelfCalls && taba(target, source.params)) ||
        target;
}

