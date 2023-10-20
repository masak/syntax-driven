import {
    Ast,
} from "./source";
import {
    InstrJmp,
    InstrJmpUnlessReg,
    Register,
    SetInstr,
} from "./target";
import {
    Context,
} from "./context";

const controlNames = ["if"];

type ControlName = "if";

export function isControlName(s: string): s is ControlName {
    return controlNames.includes(s);
}

const REGISTER_NOT_YET_KNOWN = -1;

export function handleControl(
    opName: ControlName,
    args: Array<Ast>,
    ctx: Context,
    isTailContext: boolean,
    resultRegister: Register | null = null,
    handle: (
        ast: Ast,
        ctx: Context,
        resultRegister?: Register | null,
    ) => Register,
    handlePossiblyTail: (
        ast: Ast,
        ctx: Context,
        isTailContext: boolean,
        resultRegister?: Register | null,
    ) => Register | null,
): Register {

    function resultRegOrNextReg() {
        return resultRegister === null
            ? ctx.nextReg()
            : resultRegister;
    }

    if (opName === "if") {
        let fixups: Array<SetInstr> = [];
        let ifEndLabel = ctx.nextAvailableLabel("if-end");
        for (let i = 0; i < args.length - 1; i += 2) {
            let test = args[i];
            let rTest = handle(test, ctx);
            let branchLabel = ctx.nextAvailableLabel("if-branch");
            ctx.writer!.addInstr(new InstrJmpUnlessReg(branchLabel, rTest));
            let consequent = args[i + 1];
            let rConsequent = handlePossiblyTail(
                consequent,
                ctx,
                isTailContext,
                REGISTER_NOT_YET_KNOWN,
            );
            if (rConsequent !== null) {
                ctx.writer!.ifLastInstrIsSetInstr((instr) => {
                    fixups.push(instr);
                    ctx.writer!.addInstr(new InstrJmp(ifEndLabel));
                });
            }
            ctx.writer!.addLabel(branchLabel);
        }
        if (args.length % 2 !== 0) {
            let consequent = args[args.length - 1];
            let rConsequent = handlePossiblyTail(
                consequent,
                ctx,
                isTailContext,
                REGISTER_NOT_YET_KNOWN,
            );
            if (rConsequent !== null) {
                ctx.writer!.ifLastInstrIsSetInstr((instr) => {
                    fixups.push(instr);
                });
            }
        }
        ctx.writer!.addLabel(ifEndLabel);

        let resultRegister = resultRegOrNextReg();
        for (let instr of fixups) {
            instr.targetReg = resultRegister;
        }
        return resultRegister;
    }
    else {
        let _coverageCheck: never = opName;
        return _coverageCheck;
    }
}

