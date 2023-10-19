import {
    Instr,
} from "./target";

export class TargetWriter {
    instrs: Array<Instr> = [];
    labels = new Map<string, number>();

    addInstr(instr: Instr): void {
        this.instrs.push(instr);
    }

    instrCount(): number {
        return this.instrs.length;
    }

    addLabel(label: string): void {
        this.labels.set(label, this.instrCount());
    }
}

