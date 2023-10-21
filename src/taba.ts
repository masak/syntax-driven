import {
    Ast,
} from "./source";
import {
    cloneInstr,
    Instr,
    InstrArgOne,
    InstrArgsStart,
    InstrJmp,
    InstrJmpIfReg,
    InstrJmpUnlessReg,
    InstrReturnReg,
    InstrSetApply,
    InstrSetGetGlobal,
    InstrSetIsStackEmpty,
    InstrSetMakeStack,
    InstrSetReg,
    InstrSetStackPop,
    InstrStackPush,
    Register,
    Target,
} from "./target";
import {
    query,
} from "./query-target";
import {
    computeDataflow,
} from "./dataflow";
import {
    TargetWriter,
} from "./write-target";
import {
    OPT_ALL,
} from "./conf";

function enumerate<T>(array: Array<T>): Array<[number, T]> {
    let result: Array<[number, T]> = [];
    for (let i = 0; i < array.length; i++) {
        result.push([i, array[i]]);
    }
    return result;
}

function shiftRegsOfInstr(instr: Instr, maxReqReg: number): Instr {
    let regOffset = +1;     // since we introduced 1 new register

    function shiftReg(reg: Register): Register {
        return reg <= maxReqReg ? reg : reg + regOffset;
    }

    return cloneInstr(instr).changeAllRegs(shiftReg);
}

export function taba(origTarget: Target, sourceParams: Ast): Target {
    let funcName = origTarget.name;
    let origInstrs = origTarget.body;
    let origLabels = origTarget.labels;
    let maxReqReg = origTarget.header.reqCount - 1;

    let registersWithSelf = query(origTarget)
        .filter((instr) => instr instanceof InstrSetGetGlobal)
        .filter((instr) => (instr as InstrSetGetGlobal).name === funcName)
        .accumSet((instr) => (instr as InstrSetGetGlobal).targetReg);
    let recursiveCalls = query(origTarget).count((instr) =>
        instr instanceof InstrSetApply && registersWithSelf.has(instr.funcReg)
    );
    let backJumps = query(origTarget)
        .filter((instr) => instr instanceof InstrJmp ||
            instr instanceof InstrJmpIfReg ||
            instr instanceof InstrJmpUnlessReg)
        .count((instr, ip) => {
            let targetIp = origLabels.get(
                (instr as InstrJmp | InstrJmpIfReg | InstrJmpUnlessReg).label
            );
            if (targetIp === undefined) {
                throw new Error("Precondition broken: label without ip");
            }
            return targetIp < ip;
        });
    if (recursiveCalls !== 1 || backJumps > 0) {
        return origTarget;
    }

    let registerWithRecursiveResult = query(origTarget)
        .filter((instr) => instr instanceof InstrSetApply)
        .filter((instr) => registersWithSelf.has(
            (instr as InstrSetApply).funcReg
        ))
        .accumOne((instr) => (instr as InstrSetApply).targetReg);

    let straddlingRegisters = computeDataflow(origInstrs)
        .straddling(maxReqReg, registerWithRecursiveResult);
    if (straddlingRegisters.length !== 1) {
        return origTarget;
    }
    let straddlingRegister = straddlingRegisters[0];

    let writer = new TargetWriter(
        funcName,
        sourceParams,
        OPT_ALL,
    );
    let stackReg = maxReqReg + 1;
    writer.addInstr(new InstrSetMakeStack(stackReg));
    writer.addLabel("top");
    let regOffset = +1;     // since we introduced 1 new register

    function shiftReg(reg: Register): Register {
        return reg <= maxReqReg ? reg : reg + regOffset;
    }

    let activelyCopying = true;
    let atRecursiveCall = false;
    let savedInstrs: Array<Instr> = [];
    let argIndex = 0;
    let returnedRegister = query(origTarget)
        .filter((instr) => instr instanceof InstrReturnReg)
        .accumArray((instr) => (instr as InstrReturnReg).returnReg)[0];

    for (let [ip, instr] of enumerate(origInstrs)) {
        if (atRecursiveCall && instr instanceof InstrArgsStart) {
            argIndex = 0;
        }

        if (atRecursiveCall && instr instanceof InstrArgOne) {
            if (instr.register <= maxReqReg) {
                if (instr.register === argIndex) {
                    // required parameter unchanged in recursive call
                }
                else {
                    throw new Error("Unhandled: cross-parameter assignment");
                }
            }
            else {
                // translate this argument passing into an assignment from
                // a local variable to a parameter
                writer.addInstr(new InstrSetReg(
                    argIndex as Register,
                    shiftReg(instr.register),
                ));
            }
            argIndex += 1;
        }

        if (atRecursiveCall && instr instanceof InstrSetApply) {
            writer.addInstr(new InstrStackPush(
                stackReg,
                shiftReg(straddlingRegister),
            ));
            writer.addInstr(new InstrJmp("top"));
        }

        for (let [label, labelIp] of origLabels.entries()) {
            if (ip === labelIp) {
                writer.addLabel(label);
            }
        }

        if (!activelyCopying) {
            let labelPointsHere = false;
            for (let labelIp of origLabels.values()) {
                if (labelIp === ip) {
                    labelPointsHere = true;
                }
            }
            if (labelPointsHere) {
                writer.addLabel("unspool");
                writer.addInstr(new InstrSetIsStackEmpty(
                    shiftReg(straddlingRegister),
                    stackReg,
                ));
                writer.addInstr(new InstrJmpIfReg(
                    "unspool-done",
                    shiftReg(straddlingRegister),
                ));
                writer.addInstr(new InstrSetStackPop(
                    shiftReg(straddlingRegister),
                    stackReg,
                ));
                for (let si of savedInstrs) {
                    if (si instanceof InstrArgOne) {
                        writer.addInstr(new InstrArgOne(
                            si.register === registerWithRecursiveResult
                                ? shiftReg(returnedRegister)
                                : shiftReg(si.register)
                        ));
                    }
                    else {
                        writer.addInstr(shiftRegsOfInstr(si, maxReqReg));
                    }
                }
                writer.addLabel("unspool-done");
                activelyCopying = true;
            }
            else {
                if (!atRecursiveCall) {
                    savedInstrs.push(instr);
                }

                if (atRecursiveCall && instr instanceof InstrSetApply) {
                    atRecursiveCall = false;
                }

                continue;
            }
        }

        if (instr instanceof InstrSetGetGlobal && instr.name === funcName) {
            activelyCopying = false;
            atRecursiveCall = true;
            continue;
        }

        writer.addInstr(shiftRegsOfInstr(instr, maxReqReg));
    }

    return writer.target();
}

