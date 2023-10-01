import {
    Env,
} from "./env";
import {
    Instr,
    InstrArgOne,
    InstrArgsEnd,
    InstrArgsStart,
    InstrJmp,
    InstrJmpIfReg,
    InstrJmpUnlessReg,
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
    InstrReturnReg,
    Target,
} from "./target";

export const OPCODE_SET_PRIM_ID_REG_SYM = 0x00;
export const OPCODE_SET_PRIM_ID_REG_NIL = 0x01;
export const OPCODE_SET_PRIM_ID_REG_T = 0x02;
export const OPCODE_SET_PRIM_TYPE_REG = 0x03;
export const OPCODE_SET_PRIM_CAR_REG = 0x04;
export const OPCODE_SET_PRIM_CDR_REG = 0x05;

export const OPCODE_ARGS_START = 0x10;
export const OPCODE_ARG_ONE = 0x11;
export const OPCODE_ARGS_END = 0x18;
export const OPCODE_SET_APPLY = 0x19;

export const OPCODE_SET_GLOBAL = 0x20;
export const OPCODE_SET_SYMBOL = 0x21;
export const OPCODE_SET_REG = 0x22;
export const OPCODE_SET_NIL = 0x23;
export const OPCODE_SET_T = 0x24;

export const OPCODE_JMP = 0x30;
export const OPCODE_JMP_IF = 0x31;
export const OPCODE_JMP_UNLESS = 0x32;
export const OPCODE_RETURN_REG = 0x33;

export const OPCODE_SET_MAKE_STACK = 0x40;
export const OPCODE_SET_STACK_EMPTY = 0x41;
export const OPCODE_SET_STACK_POP = 0x42;
export const OPCODE_STACK_PUSH = 0x43;

const SIZE = 1_024;

const TYPE_SYM = 0x01;

const internTypes = new Map<number, string>([
    [TYPE_SYM, "symbol"],
]);

interface Deferred {
    pos: number;
    fixupName: string;
}

function highLow(value: number) {
    let high = Math.floor(value / 0x100);
    let low = value % 0x100;
    return [high, low];
}

class Writer {
    private pos = 0;
    private strings: Map<string, number> = new Map();
    private globals: Map<string, number> = new Map();
    private deferreds: Array<Deferred> = [];
    private fixups: Map<string, number> = new Map();

    constructor(public bytes = new Uint8Array(SIZE)) {
    }

    writeBytecodeHeader(): void {
        this.defer4Bytes(
            "globals-list:high-byte",
            "globals-list:low-byte",
            "globals-list-end:high-byte",
            "globals-list-end:low-byte",
        );
    }

    writeStringsForFunc(func: Target): void {
        let writeString = (s: string) => {
            if (this.strings.has(s)) {
                return;
            }
            this.strings.set(s, this.pos);
            this.defer4Bytes(
                TYPE_SYM,
                0,
                `string:${s}:high-byte`,
                `string:${s}:low-byte`,
            );
        };

        writeString(func.name);
        for (let instr of func.body) {
            if (instr instanceof InstrSetPrimIdRegSym) {
                writeString(instr.rightSym);
            }
        }
    }

    writeStringList(): void {
        for (let string of this.strings.keys()) {
            let posHighByte = Math.floor(this.pos / 0x100);
            let posLowByte = this.pos % 0x100;
            this.fixups.set(`string:${string}:high-byte`, posHighByte);
            this.fixups.set(`string:${string}:low-byte`, posLowByte);
            if (string.length > 127) {
                throw new Error("String too long for interning");
            }
            this.write1Byte(string.length);
            for (let char of string.split("")) {
                let codepoint = char.codePointAt(0);
                if (codepoint === undefined || codepoint > 127) {
                    throw new Error("Not yet ready to store non-ASCII");
                }
                this.write1Byte(codepoint);
            }
            while (this.pos % 4 !== 0) {
                ++this.pos;
            }
        }
    }

    registerGlobalsListPos(): void {
        let [highByte, lowByte] = highLow(this.pos);
        this.fixups.set(`globals-list:high-byte`, highByte);
        this.fixups.set(`globals-list:low-byte`, lowByte);
    }

    writeGlobalsListEntry(func: Target): void {
        this.globals.set(func.name, this.pos);
        let stringAddr = this.strings.get(func.name);
        if (stringAddr === undefined) {
            throw new Error(
                `Precondition broken: function name '${func.name}' ` +
                "was not added as a string"
            );
        }
        this.defer4Bytes(
            0,
            stringAddr,
            `func:${func.name}:high-byte`,
            `func:${func.name}:low-byte`,
        );
    }

    registerGlobalsListEndPos(): void {
        let [highByte, lowByte] = highLow(this.pos);
        this.fixups.set(`globals-list-end:high-byte`, highByte);
        this.fixups.set(`globals-list-end:low-byte`, lowByte);
    }

    writeFunc(func: Target): void {
        let name = func.name;
        let [highByte, lowByte] = highLow(this.pos);
        this.fixups.set(`func:${name}:high-byte`, highByte);
        this.fixups.set(`func:${name}:low-byte`, lowByte);
        this.write4Bytes(
            func.header.reqCount,
            0,
            func.header.regCount,
            func.body.length,
        );
        for (let instr of func.body) {
            this.writeInstr(instr, func.labels);
        }
    }

    writeInstr(instr: Instr, labels: Map<string, number>): void {
        if (instr instanceof InstrSetPrimIdRegSym) {
            if (instr.rightSym === "nil") {
                this.write4Bytes(
                    OPCODE_SET_PRIM_ID_REG_NIL,
                    instr.targetReg,
                    instr.leftReg,
                    0,
                );
            }
            else if (instr.rightSym === "t") {
                this.write4Bytes(
                    OPCODE_SET_PRIM_ID_REG_T,
                    instr.targetReg,
                    instr.leftReg,
                    0,
                );
            }
            else {
                let symPos = this.strings.get(instr.rightSym);
                if (symPos === undefined) {
                    throw new Error(
                        "Precondition broken: string " +
                        `'${instr.rightSym}' was not stored`
                    );
                }
                if (symPos > 0xFF) {
                    throw new Error("Temporary limitation exceeded");
                    // XXX: time to get a separate "get symbol" instruction
                }
                this.write4Bytes(
                    OPCODE_SET_PRIM_ID_REG_SYM,
                    instr.targetReg,
                    instr.leftReg,
                    symPos,
                );
            }
        }
        else if (instr instanceof InstrSetPrimTypeReg) {
            this.write4Bytes(
                OPCODE_SET_PRIM_TYPE_REG,
                instr.targetReg,
                instr.objectReg,
                0,
            );
        }
        else if (instr instanceof InstrSetPrimCarReg) {
            this.write4Bytes(
                OPCODE_SET_PRIM_CAR_REG,
                instr.targetReg,
                instr.objectReg,
                0,
            );
        }
        else if (instr instanceof InstrSetPrimCdrReg) {
            this.write4Bytes(
                OPCODE_SET_PRIM_CDR_REG,
                instr.targetReg,
                instr.objectReg,
                0,
            );
        }
        else if (instr instanceof InstrSetReg) {
            this.write4Bytes(
                OPCODE_SET_REG,
                instr.targetReg,
                instr.sourceReg,
                0,
            );
        }
        else if (instr instanceof InstrArgsStart) {
            this.write4Bytes(
                OPCODE_ARGS_START,
                0,
                0,
                0,
            );
        }
        else if (instr instanceof InstrArgOne) {
            this.write4Bytes(
                OPCODE_ARG_ONE,
                instr.register,
                0,
                0,
            );
        }
        else if (instr instanceof InstrArgsEnd) {
            this.write4Bytes(
                OPCODE_ARGS_END,
                0,
                0,
                0,
            );
        }
        else if (instr instanceof InstrSetApply) {
            this.write4Bytes(
                OPCODE_SET_APPLY,
                instr.targetReg,
                instr.funcReg,
                0,
            );
        }
        else if (instr instanceof InstrSetGetGlobal) {
            let globalPos = this.globals.get(instr.name);
            if (globalPos === undefined) {
                throw new Error(
                    "Precondition broken: global " +
                    `'${instr.name}' was not stored`
                );
            }
            this.write4Bytes(
                OPCODE_SET_GLOBAL,
                instr.targetReg,
                globalPos,
                0,
            );
        }
        else if (instr instanceof InstrSetGetSymbol) {
            if (instr.name === "nil") {
                this.write4Bytes(
                    OPCODE_SET_NIL,
                    instr.targetReg,
                    0,
                    0,
                );
            }
            else if (instr.name === "t") {
                this.write4Bytes(
                    OPCODE_SET_T,
                    instr.targetReg,
                    0,
                    0,
                );
            }
            else {
                let symPos = this.strings.get(instr.name);
                if (symPos === undefined) {
                    throw new Error(
                        "Precondition broken: string " +
                        `'${instr.name}' was not stored`
                    );
                }
                let symPosHighByte = Math.floor(symPos / 0x100);
                let symPosLowByte = symPos % 0x100;
                this.write4Bytes(
                    OPCODE_SET_SYMBOL,
                    instr.targetReg,
                    symPosHighByte,
                    symPosLowByte,
                );
            }
        }
        else if (instr instanceof InstrReturnReg) {
            this.write4Bytes(
                OPCODE_RETURN_REG,
                0,
                instr.returnReg,
                0,
            );
        }
        else if (instr instanceof InstrJmp) {
            let jumpIp = labels.get(instr.label);
            if (jumpIp === undefined) {
                throw new Error(`Label '${instr.label} not found`);
            }
            this.write4Bytes(
                OPCODE_JMP,
                0,
                jumpIp,
                0,
            );
        }
        else if (instr instanceof InstrJmpIfReg) {
            let jumpIp = labels.get(instr.label);
            if (jumpIp === undefined) {
                throw new Error(`Label '${instr.label} not found`);
            }
            this.write4Bytes(
                OPCODE_JMP_IF,
                instr.testReg,
                jumpIp,
                0,
            );
        }
        else if (instr instanceof InstrJmpUnlessReg) {
            let jumpIp = labels.get(instr.label);
            if (jumpIp === undefined) {
                throw new Error(`Label '${instr.label} not found`);
            }
            this.write4Bytes(
                OPCODE_JMP_UNLESS,
                instr.testReg,
                jumpIp,
                0,
            );
        }
        else if (instr instanceof InstrSetMakeStack) {
            this.write4Bytes(
                OPCODE_SET_MAKE_STACK,
                instr.targetReg,
                0,
                0,
            );
        }
        else if (instr instanceof InstrSetIsStackEmpty) {
            this.write4Bytes(
                OPCODE_SET_STACK_EMPTY,
                instr.targetReg,
                instr.stackReg,
                0,
            );
        }
        else if (instr instanceof InstrSetStackPop) {
            this.write4Bytes(
                OPCODE_SET_STACK_POP,
                instr.targetReg,
                instr.stackReg,
                0,
            );
        }
        else if (instr instanceof InstrStackPush) {
            this.write4Bytes(
                OPCODE_STACK_PUSH,
                instr.stackReg,
                instr.valueReg,
                0,
            );
        }
        else {
            let _coverageCheck: never = instr;
            return _coverageCheck;
        }
    }

    write1Byte(b: number) {
        this.bytes[this.pos] = b;

        this.pos += 1;
    }

    write4Bytes(b1: number, b2: number, b3: number, b4: number) {
        this.write1Byte(b1);
        this.write1Byte(b2);
        this.write1Byte(b3);
        this.write1Byte(b4);
    }

    defer4Bytes(
        b1: number | string,
        b2: number | string,
        b3: number | string,
        b4: number | string,
    ) {
        for (let byte of [b1, b2, b3, b4]) {
            if (typeof byte === "number") {
                this.write1Byte(byte);
            }
            else { // typeof byte === "string"
                let deferred = {
                    pos: this.pos,
                    fixupName: byte,
                };
                this.deferreds.push(deferred);
                this.pos += 1;
            }
        }
    }

    handleDeferred() {
        for (let deferred of this.deferreds) {
            let name = deferred.fixupName;
            let value = this.fixups.get(name);
            if (value === undefined) {
                throw new Error(`Value for fixup '${name}' not set`);
            }
            this.bytes[deferred.pos] = value;
        }
    }
}

type Entry =
    HeaderEntry |
    InternEntry |
    StringEntry |
    GlobalEntry |
    BcfnEntry;

interface HeaderEntry {
    type: "header";
    bytes: Array<number>;
}

interface InternEntry {
    type: "intern";
    addr: number;
    size: number;
    category: number;
    categoryName: string;
    ref: number;
    bytes: Array<number>;
}

interface StringEntry {
    type: "string";
    addr: number;
    size: number;
    content: string;
    bytes: Array<number>;
}

interface GlobalEntry {
    type: "global";
    addr: number;
    size: number;
    name: string;
    ref: number;
    bytes: Array<number>;
}

interface BcfnEntry {
    type: "bcfn";
    addr: number;
    size: number;
    name: string;
    req: number;
    reg: number;
    instrCount: number;
    bytes: Array<number>;
}

interface BcDump {
    entries: Array<Entry>;
    totalByteDumpSize: number;
}

function hex(n: number, padToLength = 0): string {
    let s = n.toString(16);
    while (s.length < padToLength) {
        s = "0" + s;
    }
    return "0x" + s;
}

function roundUpToNearest4(n: number) {
    return Math.ceil(n / 4) * 4;
}

export class Bytecode {
    bytes: Uint8Array;

    constructor(env: Env) {
        let writer = new Writer();

        writer.writeBytecodeHeader();
        for (let name of env.names()) {
            writer.writeStringsForFunc(env.get(name));
        }
        writer.writeStringList();
        writer.registerGlobalsListPos();
        for (let name of env.names()) {
            writer.writeGlobalsListEntry(env.get(name));
        }
        writer.registerGlobalsListEndPos();
        for (let name of env.names()) {
            writer.writeFunc(env.get(name));
        }
        writer.handleDeferred();

        this.bytes = writer.bytes;
    }

    get4Bytes(pos: number): [number, number, number, number] {
        return [
            this.bytes[pos],
            this.bytes[pos + 1],
            this.bytes[pos + 2],
            this.bytes[pos + 3],
        ];
    }

    getString(addr: number): string {
        let stringAddrHighByte = this.bytes[addr + 2];
        let stringAddrLowByte = this.bytes[addr + 3];
        let stringAddr = 0x100 * stringAddrHighByte + stringAddrLowByte;
        let length = this.bytes[stringAddr];
        let result: Array<string> = [];
        for (let i = 0; i < length; i++) {
            let char = String.fromCodePoint(this.bytes[stringAddr + 1 + i]);
            result.push(char);
        }
        return result.join("");
    }

    getGlobal(index: number): number {
        let globalsListHighByte = this.bytes[0];
        let globalsListLowByte = this.bytes[1];
        let globalsListAddr = 0x100 * globalsListHighByte + globalsListLowByte;
        let addr = globalsListAddr + 4 * index;
        let globalHighByte = this.bytes[addr + 2];
        let globalLowByte = this.bytes[addr + 3];
        let global = 0x100 * globalHighByte + globalLowByte;
        return global;
    }

    findGlobal(name: string): number {
        let globalsListHighByte = this.bytes[0];
        let globalsListLowByte = this.bytes[1];
        let globalsListEndHighByte = this.bytes[2];
        let globalsListEndLowByte = this.bytes[3];
        let pos = 0x100 * globalsListHighByte + globalsListLowByte;
        let endPos = 0x100 * globalsListEndHighByte + globalsListEndLowByte;
        while (pos < endPos) {
            let stringAddr = this.bytes[pos + 1];
            let globalHighByte = this.bytes[pos + 2];
            let globalLowByte = this.bytes[pos + 3];

            let globalName = this.getString(stringAddr);
            if (globalName === name) {
                return 0x100 * globalHighByte + globalLowByte;
            }

            pos += 4;
        }
        throw new Error(`Global '${name}' not found`);
    }

    private dumpBytes(addr: number, length: number): Array<number> {
        let slice = [];
        for (let offset = 0; offset < length; offset++) {
            slice.push(this.bytes[addr + offset]);
        }
        return slice;
    }

    dump(): BcDump {
        let entries: Array<Entry> = [];
        let [b1, b2, b3, b4] = [
            this.bytes[0],
            this.bytes[1],
            this.bytes[2],
            this.bytes[3],
        ];
        entries.push({
            type: "header",
            bytes: [b1, b2, b3, b4],
        });
        let globalsAddr = 0x100 * b1 + b2;
        let globalsEndAddr = 0x100 * b3 + b4;
        let [bp3, bp4] = [
            this.bytes[4 + 2],
            this.bytes[4 + 3],
        ];
        let stringsAddr = 0x100 * bp3 + bp4;
        let stringAddrs = new Set<number>();
        let internMap = new Map<number, number>();
        for (let i = 4; i < stringsAddr; i += 4) {
            let [b1, _, b3, b4] = [
                this.bytes[i + 0],
                this.bytes[i + 1],
                this.bytes[i + 2],
                this.bytes[i + 3],
            ];
            let internAddr = 0x100 * b3 + b4;
            internMap.set(i, internAddr);
            entries.push({
                type: "intern",
                addr: i,
                size: 4,
                category: b1,
                categoryName: internTypes.get(b1),
                ref: internAddr,
                bytes: this.dumpBytes(i, 4),
            } as InternEntry);
            stringAddrs.add(internAddr);
        }
        let stringMap = new Map<number, string>();
        for (let stringAddr of stringAddrs) {
            let length = this.bytes[stringAddr];
            let content = [];
            for (let i = 0; i < length; i++) {
                let char = this.bytes[stringAddr + 1 + i];
                content.push(String.fromCodePoint(char));
            }
            let s = content.join("");
            let size = roundUpToNearest4(1 + length);
            stringMap.set(stringAddr, s);
            entries.push({
                type: "string",
                addr: stringAddr,
                size,
                content: s,
                bytes: this.dumpBytes(stringAddr, size),
            } as StringEntry);
        }
        let funcs = new Map<number, string>();
        for (let i = globalsAddr; i < globalsEndAddr; i += 4) {
            let [_, b2, b3, b4] = [
                this.bytes[i + 0],
                this.bytes[i + 1],
                this.bytes[i + 2],
                this.bytes[i + 3],
            ];
            let stringAddr = internMap.get(b2);
            if (stringAddr === undefined) {
                throw new Error(`Address ${hex(b2)} doesn't point to intern`);
            }
            let globalName = stringMap.get(stringAddr);
            if (globalName === undefined) {
                throw new Error(
                    `Address ${hex(stringAddr)} doesn't point to string`);
            }
            let funcAddr = 0x100 * b3 + b4;
            funcs.set(funcAddr, globalName);
            entries.push({
                type: "global",
                addr: i,
                size: 4,
                name: globalName,
                ref: funcAddr,
                bytes: this.dumpBytes(i, 4),
            } as GlobalEntry);
        }
        let totalByteDumpSize = globalsEndAddr;
        for (let [funcAddr, name] of funcs.entries()) {
            let [req, _, reg, instrCount] = [
                this.bytes[funcAddr + 0],
                this.bytes[funcAddr + 1],
                this.bytes[funcAddr + 2],
                this.bytes[funcAddr + 3],
            ];
            let size = 4 + 4 * instrCount;
            totalByteDumpSize = funcAddr + size;
            entries.push({
                type: "bcfn",
                addr: funcAddr,
                size,
                name,
                req,
                reg,
                instrCount,
                bytes: this.dumpBytes(funcAddr, size),
            } as BcfnEntry);
        }
        return { entries, totalByteDumpSize };
    }
}
