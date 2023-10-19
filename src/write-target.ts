import {
    Instr,
} from "./target";

export class TargetWriter {
    instrs: Array<Instr> = [];

    addInstr(instr: Instr): void {
        this.instrs.push(instr);
    }

    instrCount(): number {
        return this.instrs.length;
    }
}

