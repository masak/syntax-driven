import {
    Instr,
    InstrArgOne,
    InstrArgsEnd,
    InstrArgsStart,
    InstrJmp,
    InstrJmpIfReg,
    InstrJmpUnlessReg,
    InstrReturnReg,
    InstrSetApply,
    InstrSetGetGlobal,
    InstrSetGetSymbol,
    InstrSetIsStackEmpty,
    InstrSetMakeStack,
    InstrSetPrimCarReg,
    InstrSetPrimCdrReg,
    InstrSetPrimIdRegSym,
    InstrSetPrimTypeReg,
    InstrSetReg,
    InstrSetStackPop,
    InstrStackPush,
    Register,
    Target,
} from "./target";
import {
    query,
} from "./query-target";

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

    if (instr instanceof InstrSetPrimIdRegSym) {
        return new InstrSetPrimIdRegSym(
            shiftReg(instr.targetReg),
            shiftReg(instr.leftReg),
            instr.rightSym,
        );
    }
    else if (instr instanceof InstrReturnReg) {
        return new InstrReturnReg(shiftReg(instr.returnReg));
    }
    else if (instr instanceof InstrSetGetGlobal) {
        return new InstrSetGetGlobal(
            shiftReg(instr.targetReg),
            instr.name,
        );
    }
    else if (instr instanceof InstrSetGetSymbol) {
        return new InstrSetGetSymbol(
            shiftReg(instr.targetReg),
            instr.name,
        );
    }
    else if (instr instanceof InstrSetPrimTypeReg) {
        return new InstrSetPrimTypeReg(
            shiftReg(instr.targetReg),
            shiftReg(instr.objectReg),
        );
    }
    else if (instr instanceof InstrSetPrimCarReg) {
        return new InstrSetPrimCarReg(
            shiftReg(instr.targetReg),
            shiftReg(instr.objectReg),
        );
    }
    else if (instr instanceof InstrSetPrimCdrReg) {
        return new InstrSetPrimCdrReg(
            shiftReg(instr.targetReg),
            shiftReg(instr.objectReg),
        );
    }
    else if (instr instanceof InstrSetReg) {
        return new InstrSetReg(
            shiftReg(instr.targetReg),
            shiftReg(instr.sourceReg),
        );
    }
    else if (instr instanceof InstrArgsStart) {
        return new InstrArgsStart();
    }
    else if (instr instanceof InstrArgOne) {
        return new InstrArgOne(shiftReg(instr.register));
    }
    else if (instr instanceof InstrArgsEnd) {
        return new InstrArgsEnd();
    }
    else if (instr instanceof InstrSetApply) {
        return new InstrSetApply(
            shiftReg(instr.targetReg),
            shiftReg(instr.funcReg),
        );
    }
    else if (instr instanceof InstrJmp) {
        return new InstrJmp(
            instr.label,
        );
    }
    else if (instr instanceof InstrJmpIfReg) {
        return new InstrJmpIfReg(
            instr.label,
            shiftReg(instr.testReg),
        );
    }
    else if (instr instanceof InstrJmpUnlessReg) {
        return new InstrJmpUnlessReg(
            instr.label,
            shiftReg(instr.testReg),
        );
    }
    else if (instr instanceof InstrSetMakeStack) {
        return new InstrSetMakeStack(
            shiftReg(instr.targetReg),
        );
    }
    else if (instr instanceof InstrSetIsStackEmpty) {
        return new InstrSetIsStackEmpty(
            shiftReg(instr.targetReg),
            shiftReg(instr.stackReg),
        );
    }
    else if (instr instanceof InstrSetStackPop) {
        return new InstrSetStackPop(
            shiftReg(instr.targetReg),
            shiftReg(instr.stackReg),
        );
    }
    else if (instr instanceof InstrStackPush) {
        return new InstrStackPush(
            shiftReg(instr.stackReg),
            shiftReg(instr.valueReg),
        );
    }
    else {
        let _coverageCheck: never = instr;
        return _coverageCheck;
    }
}

export function reynolds(origTarget: Target): Target {
    let funcName = origTarget.name;
    let origInstrs = origTarget.body;
    let origLabels = origTarget.labels;
    let maxReqReg = origTarget.header.reqCount - 1;

    let registersWithSelf = query(origTarget)
        .filter((instr) => instr instanceof InstrSetGetGlobal)
        .filter((instr) => (instr as InstrSetGetGlobal).name === funcName)
        .accumSet<Register>((instr) => (instr as InstrSetGetGlobal).targetReg);
    let returnedRegister: Register = -1;
    let dataFlow = new Map<Register, Set<Register>>();

    function addDataFlow(sourceReg: Register, targetReg: Register): void {
        if (!dataFlow.has(sourceReg)) {
            dataFlow.set(sourceReg, new Set());
        }
        dataFlow.get(sourceReg)!.add(targetReg);
    }

    for (let instr of origInstrs) {
        if (instr instanceof InstrReturnReg) {
            returnedRegister = instr.returnReg;
        }

        if (instr instanceof InstrSetPrimCarReg) {
            addDataFlow(instr.objectReg, instr.targetReg);
        }
        else if (instr instanceof InstrSetPrimCdrReg) {
            addDataFlow(instr.objectReg, instr.targetReg);
        }
        else if (instr instanceof InstrSetPrimIdRegSym) {
            addDataFlow(instr.leftReg, instr.targetReg);
        }
        else if (instr instanceof InstrSetPrimTypeReg) {
            addDataFlow(instr.objectReg, instr.targetReg);
        }
        else if (instr instanceof InstrSetReg) {
            addDataFlow(instr.sourceReg, instr.targetReg);
        }
        else if (instr instanceof InstrArgOne) {
            addDataFlow(instr.register, -2 as Register);
        }
        else if (instr instanceof InstrSetApply) {
            let targetReg = instr.targetReg;
            for (let [source, targets] of dataFlow.entries()) {
                dataFlow.set(
                    source,
                    new Set([...targets].map((target) =>
                        target === -2 ? targetReg : target
                    )),
                );
            }
            addDataFlow(instr.funcReg, targetReg);
        }
        else if (instr instanceof InstrReturnReg) {
            addDataFlow(instr.returnReg, -1 as Register);
        }
        else if (instr instanceof InstrJmpIfReg) {
            addDataFlow(instr.testReg, -1 as Register);
        }
        else if (instr instanceof InstrJmpUnlessReg) {
            addDataFlow(instr.testReg, -1 as Register);
        }
        else if (instr instanceof InstrStackPush) {
            addDataFlow(instr.valueReg, instr.stackReg);
        }
        else if (instr instanceof InstrSetIsStackEmpty) {
            addDataFlow(instr.stackReg, instr.targetReg);
        }
        else if (instr instanceof InstrSetStackPop) {
            addDataFlow(instr.stackReg, instr.targetReg);
        }
        // non-exhaustive list of instruction types
    }

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
        .accumOne<Register>((instr) => (instr as InstrSetApply).targetReg);

    let straddlingRegisters = new Set<Register>();
    for (let sourceReg of dataFlow.keys()) {
        if (sourceReg <= maxReqReg) {
            continue;
        }
        if (sourceReg >= registerWithRecursiveResult) {
            continue;
        }
        for (let targetReg of dataFlow.get(sourceReg)!) {
            if (targetReg <= registerWithRecursiveResult) {
                continue;
            }
            straddlingRegisters.add(sourceReg);
        }
    }

    if (straddlingRegisters.size !== 1) {
        return origTarget;
    }
    let straddlingRegister = [...straddlingRegisters][0];

    let newInstrs: Array<Instr> = [];
    let stackReg = maxReqReg + 1;
    newInstrs.push(new InstrSetMakeStack(stackReg));
    let regOffset = +1;     // since we introduced 1 new register

    function shiftReg(reg: Register): Register {
        return reg <= maxReqReg ? reg : reg + regOffset;
    }

    let activelyCopying = true;
    let atRecursiveCall = false;
    //let recursiveCallResultReg = NaN;
    let trailerHeaderLength = NaN;
    let ipMap = new Map<number, number>();
    let savedLabel = "<not yet saved>";
    let savedInstrs: Array<Instr> = [];
    let argIndex = 0;

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
                newInstrs.push(new InstrSetReg(
                    argIndex as Register,
                    shiftReg(instr.register),
                ));
            }
            argIndex += 1;
        }

        if (atRecursiveCall && instr instanceof InstrSetApply) {
            newInstrs.push(new InstrStackPush(
                stackReg,
                shiftReg(straddlingRegister),
            ));
            newInstrs.push(new InstrJmp("top"));
            //recursiveCallResultReg = instr.targetReg;
        }

        ipMap.set(ip, newInstrs.length);

        if (!activelyCopying) {
            let labelPointsHere = false;
            for (let [label, labelIp] of origLabels.entries()) {
                if (labelIp === ip) {
                    labelPointsHere = true;
                    savedLabel = label;
                }
            }
            if (labelPointsHere) {
                let l1 = newInstrs.length;
                newInstrs.push(new InstrSetIsStackEmpty(
                    shiftReg(straddlingRegister),
                    stackReg,
                ));
                newInstrs.push(new InstrJmpIfReg(
                    "unspool-done",
                    shiftReg(straddlingRegister),
                ));
                newInstrs.push(new InstrSetStackPop(
                    shiftReg(straddlingRegister),
                    stackReg,
                ));
                trailerHeaderLength = newInstrs.length - l1;
                for (let si of savedInstrs) {
                    if (si instanceof InstrArgOne) {
                        newInstrs.push(new InstrArgOne(
                            si.register === registerWithRecursiveResult
                                ? shiftReg(returnedRegister)
                                : shiftReg(si.register)
                        ));
                    }
                    else {
                        newInstrs.push(shiftRegsOfInstr(si, maxReqReg));
                    }
                }
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

        newInstrs.push(shiftRegsOfInstr(instr, maxReqReg));
    }

    let newLabels = new Map<string, number>();
    newLabels.set("top", 1);
    for (let [label, ip] of origLabels.entries()) {
        let newIp = ipMap.get(ip);
        if (typeof newIp === "number") {
            newLabels.set(label, newIp);
        }
    }
    newLabels.set("unspool", ipMap.get(origLabels.get(savedLabel)!)!);
    newLabels.set(
        "unspool-done",
        ipMap.get(origLabels.get(savedLabel)!)! +
            savedInstrs.length +
            trailerHeaderLength,
    );

    let regCount = shiftReg(origTarget.header.regCount);

    return new Target(
        funcName,
        { reqCount: origTarget.header.reqCount, regCount },
        newInstrs,
        newLabels,
    );
}

