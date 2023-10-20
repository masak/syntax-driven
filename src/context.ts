import {
    Ast,
} from "./source";
import {
    Env,
} from "./env";
import {
    Register,
} from "./target";
import {
    Conf,
} from "./conf";
import {
    TargetWriter,
} from "./write-target";

export class Context {
    writer: TargetWriter | null = null;
    unusedReg = 0;
    registerMap = new Map<string, Register>();
    topIndex = 0;
    reqCount = -1;

    constructor(
        public sourceName: string,
        public sourceParams: Ast,
        public env: Env,
        public conf: Conf,
    ) {
    }

    nextReg(): Register {
        return this.unusedReg++;
    }

    nextAvailableLabel(prefix: string) {
        return this.writer!.nextAvailableLabel(prefix);
    }

    setTopIndex() {
        this.topIndex = this.writer!.instrs.length;
    }

    setReqCount(reqCount: number) {
        this.reqCount = reqCount;
        this.writer = new TargetWriter(this.sourceName, reqCount);
    }
}

