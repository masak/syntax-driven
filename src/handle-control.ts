import {
    Ast,
} from "./source";
import {
    InstrJmp,
    InstrJmpUnlessReg,
    Register,
} from "./target";
import {
    TargetWriter,
} from "./write-target";

const controlNames = ["if"];

type ControlName = "if";

export function isControlName(s: string): s is ControlName {
    return controlNames.includes(s);
}

const REGISTER_NOT_YET_KNOWN = -1;

export function handleControl(
    opName: ControlName,
    args: Array<Ast>,
    writer: TargetWriter,
    isTailContext: boolean,
    resultRegister: Register | null = null,
    handle: (
        ast: Ast,
        writer: TargetWriter,
        resultRegister?: Register | null,
    ) => Register,
    handlePossiblyTail: (
        ast: Ast,
        writer: TargetWriter,
        isTailContext: boolean,
        resultRegister?: Register | null,
    ) => Register | null,
): Register {
    if (opName === "if") {
        return writer.writeWithFixups((scheduleFixup) => {
            let ifEndLabel = writer.nextAvailableLabel("if-end");
            for (let i = 0; i < args.length - 1; i += 2) {
                let test = args[i];
                let rTest = handle(test, writer);
                let branchLabel = writer.nextAvailableLabel("if-branch");
                writer.addInstr(new InstrJmpUnlessReg(branchLabel, rTest));
                let consequent = args[i + 1];
                let rConsequent = handlePossiblyTail(
                    consequent,
                    writer,
                    isTailContext,
                    REGISTER_NOT_YET_KNOWN,
                );
                if (rConsequent !== null) {
                    writer.ifLastInstrIsSetInstr((instr) => {
                        scheduleFixup(instr);
                        writer.addInstr(new InstrJmp(ifEndLabel));
                    });
                }
                writer.addLabel(branchLabel);
            }
            if (args.length % 2 !== 0) {
                let consequent = args[args.length - 1];
                let rConsequent = handlePossiblyTail(
                    consequent,
                    writer,
                    isTailContext,
                    REGISTER_NOT_YET_KNOWN,
                );
                if (rConsequent !== null) {
                    writer.ifLastInstrIsSetInstr(scheduleFixup);
                }
            }
            writer.addLabel(ifEndLabel);

            return resultRegister;
        });
    }
    else {
        let _coverageCheck: never = opName;
        return _coverageCheck;
    }
}

