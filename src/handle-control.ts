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

function iterateInPairs<T>(array: Array<T>, callback: (e1: T, e2: T) => void) {
    for (let i = 0; i < array.length - 1; i += 2) {
        callback(array[i], array[i + 1]);
    }
}

function handleTheOddOneOut<T>(array: Array<T>, callback: (e: T) => void) {
    if (array.length % 2 !== 0) {
        callback(array[array.length - 1]);
    }
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
            iterateInPairs(args, (test, consequent) => {
                let rTest = handle(test, writer);
                let branchLabel = writer.nextAvailableLabel("if-branch");
                writer.addInstr(new InstrJmpUnlessReg(branchLabel, rTest));
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
            });
            handleTheOddOneOut(args, (consequent) => {
                let rConsequent = handlePossiblyTail(
                    consequent,
                    writer,
                    isTailContext,
                    REGISTER_NOT_YET_KNOWN,
                );
                if (rConsequent !== null) {
                    writer.ifLastInstrIsSetInstr(scheduleFixup);
                }
            });
            writer.addLabel(ifEndLabel);

            return resultRegister;
        });
    }
    else {
        let _coverageCheck: never = opName;
        return _coverageCheck;
    }
}

