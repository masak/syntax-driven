export const bytecodeTs = `
    import {
        Env,
    } from "./env";
    import {
        Instr,
        InstrArgOne,
        InstrArgsEnd,
        InstrArgsStart,
        InstrSetApply,
        InstrSetGetGlobal,
        InstrSetPrimIdRegSym,
        InstrSetPrimTypeReg,
        InstrReturnReg,
        Target,
    } from "./target";

    export const OPCODE_SET_PRIM_ID_REG_SYM = 0x00;
    export const OPCODE_SET_PRIM_ID_REG_NIL = 0x01;
    export const OPCODE_SET_PRIM_TYPE_REG = 0x02;

    export const OPCODE_ARGS_START = 0x10;
    export const OPCODE_ARG_ONE = 0x11;
    export const OPCODE_ARGS_END = 0x18;
    export const OPCODE_SET_APPLY = 0x19;

    export const OPCODE_SET_GLOBAL = 0x20;

    export const OPCODE_RETURN_REG = 0x30;

    const SIZE = 1_024;

    const TYPE_SYM = 0x01;

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
                this.strings.set(s, this.pos);
                this.defer4Bytes(
                    TYPE_SYM,
                    0,
                    \`string:\${s}:high-byte\`,
                    \`string:\${s}:low-byte\`,
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
                this.fixups.set(\`string:\${string}:high-byte\`, posHighByte);
                this.fixups.set(\`string:\${string}:low-byte\`, posLowByte);
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
            this.fixups.set(\`globals-list:high-byte\`, highByte);
            this.fixups.set(\`globals-list:low-byte\`, lowByte);
        }

        writeGlobalsListEntry(func: Target): void {
            this.globals.set(func.name, this.pos);
            let stringAddr = this.strings.get(func.name);
            if (stringAddr === undefined) {
                throw new Error(
                    \`Precondition broken: function name '\${func.name}' \` +
                    "was not added as a string"
                );
            }
            this.defer4Bytes(
                0,
                stringAddr,
                \`func:\${func.name}:high-byte\`,
                \`func:\${func.name}:low-byte\`,
            );
        }

        registerGlobalsListEndPos(): void {
            let [highByte, lowByte] = highLow(this.pos);
            this.fixups.set(\`globals-list-end:high-byte\`, highByte);
            this.fixups.set(\`globals-list-end:low-byte\`, lowByte);
        }

        writeFunc(func: Target): void {
            let name = func.name;
            let [highByte, lowByte] = highLow(this.pos);
            this.fixups.set(\`func:\${name}:high-byte\`, highByte);
            this.fixups.set(\`func:\${name}:low-byte\`, lowByte);
            this.write4Bytes(
                func.header.reqCount,
                0,
                func.header.regCount,
                func.body.length,
            );
            for (let instr of func.body) {
                this.writeInstr(instr);
            }
        }

        writeInstr(instr: Instr): void {
            if (instr instanceof InstrSetPrimIdRegSym) {
                if (instr.rightSym === "nil") {
                    this.write4Bytes(
                        OPCODE_SET_PRIM_ID_REG_NIL,
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
                            \`'\${instr.rightSym}' was not stored\`
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
                        \`'\${instr.name}' was not stored\`
                    );
                }
                this.write4Bytes(
                    OPCODE_SET_GLOBAL,
                    instr.targetReg,
                    globalPos,
                    0,
                );
            }
            else if (instr instanceof InstrReturnReg) {
                this.write4Bytes(
                    OPCODE_RETURN_REG,
                    0,
                    instr.returnReg,
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
                    throw new Error(\`Value for fixup '\${name}' not set\`);
                }
                this.bytes[deferred.pos] = value;
            }
        }
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
            throw new Error(\`Global '\${name}' not found\`);
        }
    }

`;

export const compileTs = `
    import {
        Source,
    } from "./source";
    import {
        Env,
    } from "./env";
    import {
        Ast,
        AstList,
        AstQuote,
        AstSymbol,
    } from "./parse-source";
    import {
        Instr,
        InstrSetPrimIdRegSym,
        InstrSetPrimTypeReg,
        InstrArgsStart,
        InstrArgOne,
        InstrArgsEnd,
        InstrSetApply,
        InstrSetGetGlobal,
        InstrReturnReg,
        Register,
        Target,
    } from "./target";
    import {
        Conf,
        OPT_ALL,
    } from "./conf";
    import {
        inline,
    } from "./inline";

    const selfQuotingSymbols = new Set(["nil", "t"]);

    function qSym(ast: Ast): string | null {
        if (ast instanceof AstSymbol && selfQuotingSymbols.has(ast.name)) {
            return ast.name;
        }
        else if (ast instanceof AstQuote && ast.datum instanceof AstSymbol) {
            return ast.datum.name;
        }
        return null;
    }

    export function compile(
        source: Source,
        env: Env,
        conf: Conf = OPT_ALL,
    ): Target {
        let unusedReg = 0;
        function nextReg(): Register {
            return unusedReg++;
        }

        let instrs: Array<Instr> = [];
        let registerMap: Map<string, Register> = new Map();
        let maxReqReg = -1;

        // param handling
        if (source.params instanceof AstList) {
            for (let param of source.params.elems) {
                if (!(param instanceof AstSymbol)) {
                    throw new Error("non-symbol parameter -- todo");
                }
                let paramReg = nextReg();
                registerMap.set(param.name, paramReg);
                maxReqReg = paramReg;
            }
        }
        else if (source.params instanceof AstSymbol) {
            throw new Error("rest parameter -- todo");
        }

        // body
        function handle(ast: Ast): Register {
            if (ast instanceof AstSymbol) {
                let name = ast.name;
                if (registerMap.has(name)) {
                    return registerMap.get(name)!;
                }
                else if (env.has(name)) {
                    let globalReg = nextReg();
                    instrs.push(new InstrSetGetGlobal(globalReg, name));
                    return globalReg;
                }
                throw new Error(\`Unrecognized variable: '\${name}'\`);
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
                if (opName === "id") {
                    if (args.length < 2) {
                        throw new Error("Not enough operands for 'id'");
                    }
                    let r1 = args[0];
                    let r2 = args[1];
                    let r2Sym = qSym(r2);
                    if (!qSym(r1) && r2Sym !== null) {
                        let r1r = handle(r1);
                        let targetReg = nextReg();
                        instrs.push(
                            new InstrSetPrimIdRegSym(targetReg, r1r, r2Sym)
                        );
                        return targetReg;
                    }
                    else {
                        throw new Error("Unrecognized _kind_ of 'id' call");
                    }
                }
                else if (opName === "type") {
                    if (args.length < 1) {
                        throw new Error("Not enough operands for 'type'");
                    }
                    let r1 = args[0];
                    let r1r = handle(r1);
                    let targetReg = nextReg();
                    instrs.push(new InstrSetPrimTypeReg(targetReg, r1r));
                    return targetReg;
                }
                else if (registerMap.has(opName)) {
                    let funcReg = registerMap.get(opName)!;
                    let argRegs = args.map(handle);
                    instrs.push(new InstrArgsStart());
                    for (let reg of argRegs) {
                        instrs.push(new InstrArgOne(reg));
                    }
                    instrs.push(new InstrArgsEnd());
                    let targetReg = nextReg();
                    instrs.push(new InstrSetApply(targetReg, funcReg));
                    return targetReg;
                }
                else if (env.has(opName)) {
                    let argRegs = args.map(handle);
                    let targetReg: Register;
                    if (conf.inlineKnownCalls) {
                        targetReg = inline(
                            env.get(opName), argRegs, instrs, unusedReg
                        );
                        unusedReg = targetReg + 1;
                    }
                    else {
                        let funcReg = nextReg();
                        instrs.push(new InstrSetGetGlobal(funcReg, opName));
                        instrs.push(new InstrArgsStart());
                        for (let reg of argRegs) {
                            instrs.push(new InstrArgOne(reg));
                        }
                        instrs.push(new InstrArgsEnd());
                        targetReg = nextReg();
                        instrs.push(new InstrSetApply(targetReg, funcReg));
                    }
                    return targetReg;
                }
                else {
                    throw new Error(\`Unknown operator name '\${operator.name}'\`);
                }
            }
            else {
                throw new Error(\`Unrecognized AST type \${ast.constructor.name}\`);
            }
        }

        let returnReg = 0;
        for (let statement of source.body) {
            returnReg = handle(statement);
        }
        instrs.push(new InstrReturnReg(returnReg));

        let reqCount = maxReqReg + 1;
        let regCount = returnReg + 1;

        return new Target(
            source.name,
            { reqCount, regCount },
            instrs,
        );
    }

`;

export const confTs = `
    export interface Conf {
        inlineKnownCalls: boolean;
    }

    export const OPT_NONE: Conf = {
        inlineKnownCalls: false,
    }

    export const OPT_ALL: Conf = {
        inlineKnownCalls: true,
    }

`;

export const envTs = `
    import {
        Source,
    } from "./source";
    import {
        Target,
    } from "./target";
    import {
        compile,
    } from "./compile";

    export class Env {
        constructor(public bindings: Map<string, Target> = new Map()) {
        }

        install(source: Source): Env {
            let target = compile(source, this);
            let newBindings = new Map(this.bindings);
            newBindings.set(target.name, target);
            return new Env(newBindings);
        }

        has(name: string): boolean {
            return this.bindings.has(name);
        }

        get(name: string): Target {
            let target = this.bindings.get(name);
            if (target === undefined) {
                throw new Error(\`Cannot find target '\${name}' in environment\`);
            }
            return target;
        }

        names(): Array<string> {
            return [...this.bindings.keys()];
        }
    }

`;

export const inlineTs = `
    import {
        Instr,
        InstrArgOne,
        InstrArgsEnd,
        InstrArgsStart,
        InstrSetApply,
        InstrSetGetGlobal,
        InstrSetPrimIdRegSym,
        InstrSetPrimTypeReg,
        InstrReturnReg,
        Register,
        Target,
    } from "./target";

    export function inline(
        callee: Target,
        argRegs: Array<Register>,
        instrs: Array<Instr>,
        unusedReg: Register,
    ) {
        let registerMap: Map<Register, Register> = new Map();
        for (let i = 0; i < callee.header.reqCount; i++) {
            registerMap.set(i, argRegs[i]);
        }

        let calleeInstrs = callee.body;
        for (let instr of calleeInstrs) {
            if (instr instanceof InstrSetPrimIdRegSym) {
                registerMap.set(instr.targetReg, unusedReg++);
                instrs.push(new InstrSetPrimIdRegSym(
                    registerMap.get(instr.targetReg)!,
                    registerMap.get(instr.leftReg)!,
                    instr.rightSym,
                ));
            }
            else if (instr instanceof InstrReturnReg) {
                return registerMap.get(instr.returnReg)!;
            }
            else if (instr instanceof InstrSetGetGlobal) {
                registerMap.set(instr.targetReg, unusedReg++);
                instrs.push(new InstrSetGetGlobal(
                    registerMap.get(instr.targetReg)!,
                    instr.name,
                ));
            }
            else if (instr instanceof InstrSetPrimTypeReg) {
                registerMap.set(instr.targetReg, unusedReg++);
                instrs.push(new InstrSetPrimTypeReg(
                    registerMap.get(instr.targetReg)!,
                    registerMap.get(instr.objectReg)!,
                ));
            }
            else if (instr instanceof InstrArgsStart) {
                instrs.push(new InstrArgsStart());
            }
            else if (instr instanceof InstrArgOne) {
                instrs.push(new InstrArgOne(
                    registerMap.get(instr.register)!,
                ));
            }
            else if (instr instanceof InstrArgsEnd) {
                instrs.push(new InstrArgsEnd());
            }
            else if (instr instanceof InstrSetApply) {
                registerMap.set(instr.targetReg, unusedReg++);
                instrs.push(new InstrSetApply(
                    registerMap.get(instr.targetReg)!,
                    registerMap.get(instr.funcReg)!,
                ));
            }
            else {
                let _coverageCheck: never = instr;
                return _coverageCheck;
            }
        }

        throw new Error("Malformed bytecode: fell off the end");
    }

`;

export const parseSourceTs = `
    type Ev =
        EvOpenParen |
        EvTree |
        EvQuot;

    class EvOpenParen {
    }

    class EvTree {
        constructor(public ast: Ast) {
        }
    }

    class EvQuot {
    }

    export type Ast =
        AstFunc |
        AstList |
        AstQuote |
        AstSymbol;

    export class AstFunc {
        constructor(
            public name: string,
            public params: AstSymbol | AstList,
            public body: Array<Ast>) {
        }
    }

    export class AstList {
        constructor(public elems: Array<Ast>,) {
        }
    }

    export class AstQuote {
        constructor(public datum: Ast) {
        }
    }

    export class AstSymbol {
        constructor(public name: string) {
        }
    }

    const WHITESPACE = /^[\\s\\n]*/;
    const SYMBOL = /^\\w+/;

    function isSymbolOfName(ast: Ast, name: string): boolean {
        return ast instanceof AstSymbol && ast.name === name;
    }

    function isSymbol(ast: Ast): ast is AstSymbol {
        return ast instanceof AstSymbol;
    }

    function isParams(ast: Ast): ast is AstSymbol | AstList {
        return ast instanceof AstSymbol ||
            ast instanceof AstList;
    }

    function extractElems(stack: Array<Ev>): Array<EvTree> {
        let elems: Array<EvTree> = [];
        while (stack.length > 0) {
            let elem = stack.pop()!;
            if (elem instanceof EvQuot) {
                if (elems.length === 0) {
                    throw new Error("Quote marker without datum");
                }
                let datum = elems.shift()!;
                let quote = new AstQuote(datum.ast);
                elems.unshift(new EvTree(quote));
            }
            else if (elem instanceof EvOpenParen) {
                return elems;
            }
            else {
                elems.unshift(elem);
            }
        }
        throw new Error("Closing ')' without opening '('");
    }

    function toAst(ev: Ev): Ast {
        if (ev instanceof EvTree) {
            return ev.ast;
        }
        else {
            throw new Error(\`Not an AST: \${ev.constructor.name}\`);
        }
    }

    function toFunc(ev: Ev): AstFunc {
        if (ev instanceof EvTree) {
            if (ev.ast instanceof AstFunc) {
                return ev.ast as AstFunc;
            }
            else {
                throw new Error(\`Not a function: \${ev.ast.constructor.name}\`);
            }
        }
        throw new Error(\`Not a function: \${ev.constructor.name}\`);
    }

    export function parse(input: string): Array<AstFunc> {
        let stack: Array<Ev> = [];
        let pos = 0;

        while (pos < input.length) {
            let whitespaceLength = WHITESPACE.exec(input.substring(pos))!;
            pos += whitespaceLength[0].length;

            if (pos >= input.length) {
                break;
            }

            let m: RegExpExecArray;
            if (input.charAt(pos) === "(") {
                stack.push(new EvOpenParen());
                pos += 1;
            }
            else if (input.charAt(pos) === ")") {
                let elems = extractElems(stack);
                let list = new AstList(elems.map(toAst));
                let isFunctionDefinition = elems.length > 0 &&
                    toAst(elems[0]) instanceof AstSymbol &&
                    (toAst(elems[0]) as AstSymbol).name === "def";
                if (isFunctionDefinition) {
                    if (elems.length === 0) {
                        throw new Error("Malformed function definition: zero elements");
                    }
                    let [firstElem, funcSymbol, params, ...body] = elems.map(toAst);
                    if (!isSymbolOfName(firstElem, "def")) {
                        throw new Error("Malformed function definition: doesn't start with 'def'");
                    }
                    if (!isSymbol(funcSymbol)) {
                        throw new Error("Malformed function definition: function name not symbol");
                    }
                    if (!isParams(params)) {
                        throw new Error("Malformed funtion definition: params not a symbol or list");
                    }
                    stack.push(new EvTree(new AstFunc(funcSymbol.name, params, body)));
                }
                else {         // regular case, create a list
                    stack.push(new EvTree(list));
                }
                pos += 1;
            }
            else if (input.charAt(pos) === "'") {
                stack.push(new EvQuot());
                pos += 1;
            }
            else if (m = SYMBOL.exec(input.substring(pos))!) {
                let name = m[0];
                stack.push(new EvTree(new AstSymbol(name)));
                pos += name.length;
            }
            else {
                let fragment = input.substring(pos, pos + 10);
                throw new Error(\`Unrecognized input: '\${fragment}'\`);
            }
        }

        let funcs: Array<AstFunc> = stack.map(toFunc);
        return funcs;
    }

`;

export const parseTargetTs = `
    import {
        BaseInstr,
        Instr,
        InstrSetPrimIdRegSym,
        InstrSetPrimTypeReg,
        InstrArgsStart,
        InstrArgOne,
        InstrArgsEnd,
        InstrSetApply,
        InstrSetGetGlobal,
        InstrReturnReg,
        Target,
    } from "./target";

    const EMPTY_LINE = /^\\s*$/;
    const HEADER = /^bcfn\\s+(\\w+)\\s*\\[req:\\s*%(\\d+);\\s*reg:\\s*%0..%(\\d+)\\]$/;

    let parsers: Map<typeof BaseInstr, string> = new Map([
        [InstrSetPrimIdRegSym, ",reg ← (id ,reg ,sym)"],
        [InstrSetPrimTypeReg, ",reg ← (type ,reg)"],
        [InstrArgsStart, "(args-start)"],
        [InstrArgOne, "(arg-one ,reg)"],
        [InstrArgsEnd, "(args-end)"],
        [InstrSetApply, ",reg ← (apply ,reg)"],
        [InstrSetGetGlobal, ",reg ← (get-global ,str)"],
        [InstrReturnReg, "return ,reg"],
    ] as Array<[typeof BaseInstr, string]>);

    const REG = /^%(\\d+)/;
    const SYM = /^'?(\\w+)/;
    const STR = /^"([^"]*)"/;

    function parseInstr(input: string): Instr | null {
        PATTERN:
        for (let [constructor, pattern] of parsers.entries()) {
            let inputPos = 0;
            let patternPos = 0;
            let constructorArgs: Array<number | string> = [];
            let m: RegExpExecArray;

            while (patternPos < pattern.length) {
                if (pattern.charAt(patternPos) === ",") {
                    patternPos += 1;
                    let commaType = pattern.substring(patternPos, patternPos + 3);
                    if (commaType === "reg") {
                        if (m = REG.exec(input.substring(inputPos))!) {
                            inputPos += m[0].length;
                            constructorArgs.push(Number(m[1]));
                            patternPos += 3;
                        }
                        else {
                            continue PATTERN;
                        }
                    }
                    else if (commaType === "sym") {
                        if (m = SYM.exec(input.substring(inputPos))!) {
                            inputPos += m[0].length;
                            constructorArgs.push(m[1]);
                            patternPos += 3;
                        }
                        else {
                            continue PATTERN;
                        }
                    }
                    else if (commaType === "str") {
                        if (m = STR.exec(input.substring(inputPos))!) {
                            inputPos += m[0].length;
                            constructorArgs.push(m[1]);
                            patternPos += 3;
                        }
                        else {
                            continue PATTERN;
                        }
                    }
                    else {
                        throw new Error(\`Unknown comma type: \${commaType}\`);
                    }
                }
                else {
                    if (inputPos >= input.length) {
                        continue PATTERN;
                    }
                    if (input.charAt(inputPos) !== pattern.charAt(patternPos)) {
                        continue PATTERN;
                    }
                    inputPos += 1;
                    patternPos += 1;
                }
            }
            return new constructor(...constructorArgs);
        }
        return null;
    }

    export function parse(input: string): Target {
        let instrs: Array<Instr> = [];

        let name = "<unset>";
        let maxReqReg = 0;
        let maxReg = 0;

        for (let line of input.split("\\n")) {
            if (EMPTY_LINE.test(line)) {
                continue;
            }

            line = line.trim();

            let m: RegExpExecArray;
            let instr: Instr;

            if (m = HEADER.exec(line)!) {
                name = m[1];
                maxReqReg = Number(m[2]);
                maxReg = Number(m[3]);
                continue;
            }
            else if (instr = parseInstr(line)!) {
                instrs.push(instr);
            }
            else {
                throw new Error(\`Unrecognized line: '\${line}'\`);
            }
        }

        if (name === "<unset>") {
            throw new Error("Parse error: no header line");
        }

        let reqCount = maxReqReg + 1;
        let regCount = maxReg + 1;

        return new Target(name, { reqCount, regCount }, instrs);
    }

`;

export const runBytecodeTs = `
    import {
        Bytecode,
        OPCODE_ARGS_END,
        OPCODE_ARGS_START,
        OPCODE_ARG_ONE,
        OPCODE_RETURN_REG,
        OPCODE_SET_APPLY,
        OPCODE_SET_GLOBAL,
        OPCODE_SET_PRIM_ID_REG_NIL,
        OPCODE_SET_PRIM_ID_REG_SYM,
        OPCODE_SET_PRIM_TYPE_REG,
    } from "./bytecode";
    import {
        symbol,
        SYMBOL_NIL,
        SYMBOL_T,
        Val,
        ValChar,
        ValByteFn,
        ValFn,
        ValPair,
        ValSymbol,
    } from "./val";

    type Reaction =
        ReactionNext |
        ReactionReturn;

    class ReactionNext {
    }

    const NEXT = new ReactionNext();

    class ReactionReturn {
        constructor(public val: Val) {
        }
    }

    export class BcRuntime {
        constructor(public bytecode: Bytecode) {
        }

        private step(
            instr: [number, number, number, number],
            registers: Array<Val>,
            applyArgs: Array<Val>,
        ): Reaction {
            let opcode = instr[0];
            if (opcode === OPCODE_SET_PRIM_ID_REG_SYM) {
                let targetReg = instr[1];
                let leftReg = instr[2];
                let rightSym = this.bytecode.getString(instr[3]);
                let leftValue = registers[leftReg];
                if (leftValue instanceof ValSymbol) {
                    registers[targetReg] = leftValue.name === rightSym
                        ? SYMBOL_T
                        : SYMBOL_NIL;
                }
                else {
                    registers[targetReg] = SYMBOL_NIL;
                }
                return NEXT;
            }
            else if (opcode === OPCODE_SET_PRIM_ID_REG_NIL) {
                let targetReg = instr[1];
                let leftReg = instr[2];
                let leftValue = registers[leftReg];
                if (leftValue instanceof ValSymbol) {
                    registers[targetReg] = leftValue.name === "nil"
                        ? SYMBOL_T
                        : SYMBOL_NIL;
                }
                else {
                    registers[targetReg] = SYMBOL_NIL;
                }
                return NEXT;
            }
            else if (opcode === OPCODE_RETURN_REG) {
                let returnReg = instr[2];
                return new ReactionReturn(registers[returnReg]);
            }
            else if (opcode === OPCODE_SET_GLOBAL) {
                let targetReg = instr[1];
                let addr: number = this.bytecode.getGlobal(instr[2]);
                registers[targetReg] = new ValByteFn(addr);
                return NEXT;
            }
            else if (opcode === OPCODE_SET_PRIM_TYPE_REG) {
                let targetReg = instr[1];
                let objectReg = instr[2];
                let value = registers[objectReg];
                let result: ValSymbol;
                if (value instanceof ValChar) {
                    result = symbol("char");
                }
                else if (value instanceof ValFn) {
                    result = symbol("pair");
                }
                else if (value instanceof ValFn ||
                            value instanceof ValByteFn ||
                            value instanceof ValPair) {
                    result = symbol("pair");
                }
                else if (value instanceof ValSymbol) {
                    result = symbol("symbol");
                }
                else {
                    let _coverageCheck: never = value;
                    return _coverageCheck;
                }
                registers[targetReg] = result;
                return NEXT;
            }
            else if (opcode === OPCODE_ARGS_START) {
                // Well, isn't JavaScript fun. I guess we could also use
                // \`splice\` here, but it does seem more direct just to
                // set the length.
                applyArgs.length = 0;
                return NEXT;
            }
            else if (opcode === OPCODE_ARG_ONE) {
                let register = instr[1];
                let value = registers[register];
                applyArgs.push(value);
                return NEXT;
            }
            else if (opcode === OPCODE_ARGS_END) {
                // do nothing
                return NEXT;
            }
            else if (opcode === OPCODE_SET_APPLY) {
                let targetReg = instr[1];
                let funcReg = instr[2];
                let valByteFn = registers[funcReg];
                if (!(valByteFn instanceof ValByteFn)) {
                    throw new Error("Can't apply: not a byte function");
                }
                // TODO: CPS-transform
                let retValue = this.run(valByteFn.addr, applyArgs);
                registers[targetReg] = retValue;
                return NEXT;
            }
            else {
                throw new Error(\`Unrecognized opcode \${opcode}\`);
            }
        }

        run(func: string | number, funcArgs: Array<Val>): Val {
            let addr: number;
            if (typeof func === "number") {
                addr = func;
            }
            else {
                addr = this.bytecode.findGlobal(func);
            }

            let [reqCount, , regCount, instrCount] = this.bytecode.get4Bytes(addr);

            let registers: Array<Val> = new Array(regCount).fill(SYMBOL_NIL);
            for (let i = 0; i < reqCount; i++) {
                registers[i] = funcArgs[i];
            }

            let applyArgs: Array<Val> = [];

            let ip = 4; // skipping past the 4-byte header
            while (true) {
                let instr = this.bytecode.get4Bytes(addr + ip);
                let reaction = this.step(instr, registers, applyArgs);

                if (reaction instanceof ReactionNext) {
                    ip += 4;
                    if (ip >= 4 + 4 * instrCount) {
                        throw new Error("Malformed bytecode: fell off the end");
                    }
                }
                else if (reaction instanceof ReactionReturn) {
                    return reaction.val;
                }
                else {
                    let _coverageCheck: never = reaction;
                    return _coverageCheck;
                }
            }
        }

        fn(name: string): ValByteFn {
            let addr = this.bytecode.findGlobal(name);
            return new ValByteFn(addr);
        }
    }

`;

export const sourceTs = `
    import {
        Ast,
        AstList,
        AstSymbol,
        parse,
    } from "./parse-source";

    export class Source {
        public name: string;
        public params: AstSymbol | AstList;
        public body: Array<Ast>;

        constructor(contents: string) {
            let func = parse(contents);
            if (func.length !== 1) {
                throw new Error(\`Expected exactly 1 function, got \${func.length}\`);
            }

            this.name = func[0].name;
            this.params = func[0].params;
            this.body = func[0].body;
        }
    }

`;

export const targetTs = `
    export interface Header {
        reqCount: number;
        regCount: number;
    }

    export type Register = number;

    export type Instr =
        InstrSetPrimIdRegSym |
        InstrSetPrimTypeReg |
        InstrArgsStart |
        InstrArgOne |
        InstrArgsEnd |
        InstrSetApply |
        InstrSetGetGlobal |
        InstrReturnReg;

    export class BaseInstr {
        constructor(...args: any) {
        }
    }

    export class InstrSetPrimIdRegSym extends BaseInstr {
        constructor(
            public targetReg: Register,
            public leftReg: Register,
            public rightSym: string,
        ) {
            super();
        }
    }

    export class InstrSetPrimTypeReg extends BaseInstr {
        constructor(public targetReg: Register, public objectReg: Register) {
            super();
        }
    }

    export class InstrArgsStart extends BaseInstr {
        constructor() {
            super();
        }
    }

    export class InstrArgOne extends BaseInstr {
        constructor(public register: number) {
            super();
        }
    }

    export class InstrArgsEnd extends BaseInstr {
        constructor() {
            super();
        }
    }

    export class InstrSetApply extends BaseInstr {
        constructor(public targetReg: Register, public funcReg: Register) {
            super();
        }
    }

    export class InstrSetGetGlobal extends BaseInstr {
        constructor(public targetReg: Register, public name: string) {
            super();
        }
    }

    export class InstrReturnReg extends BaseInstr {
        constructor(public returnReg: Register) {
            super();
        }
    }

    export class Target {
        constructor(
            public name: string,
            public header: Header,
            public body: Array<Instr>,
        ) {
        }
    }

    function dump(instructions: Array<Instr>): string {
        function set(targetReg: Register, rest: string): string {
            let leftArrow = String.fromCodePoint(8592);
            return \`%\${targetReg} \${leftArrow} \${rest}\`;
        }

        let lines: Array<string> = [];
        for (let instr of instructions) {
            let line: string;
            if (instr instanceof InstrSetPrimIdRegSym) {
                line = set(
                    instr.targetReg,
                    \`(id %\${instr.leftReg} \${instr.rightSym})\`,
                );
            }
            else if (instr instanceof InstrSetPrimTypeReg) {
                line = set(instr.targetReg, \`(type %\${instr.objectReg})\`);
            }
            else if (instr instanceof InstrArgsStart) {
                line = "(args-start)";
            }
            else if (instr instanceof InstrArgOne) {
                line = \`  (arg-one %\${instr.register})\`;
            }
            else if (instr instanceof InstrArgsEnd) {
                line = "(args-end)";
            }
            else if (instr instanceof InstrSetApply) {
                line = set(instr.targetReg, \`(apply %\${instr.funcReg})\`);
            }
            else if (instr instanceof InstrSetGetGlobal) {
                line = set(instr.targetReg, \`(get-global "\${instr.name}")\`);
            }
            else if (instr instanceof InstrReturnReg) {
                line = \`(return %\${instr.returnReg})\`;
            }
            else {
                let _coverageCheck: never = instr;
                return _coverageCheck;
            }
            line = " ".repeat(5) + line;
            lines.push(line);
        }
        return lines.join("\\n");
    }

    export function stringifyTarget({ name, header, body }: Target): string {
        let { reqCount, regCount } = header;
        let headerDesc = \`[reqCount: \${reqCount}; regCount: \${regCount}]\`;
        return \`bcfn \${name} \${headerDesc}\` + "\\n" + dump(body);
    }

`;

export const valTs = `
    import {
        Target,
    } from "./target";

    export type Val =
        ValChar |
        ValFn |
        ValByteFn |
        ValPair |
        ValSymbol;

    export class ValChar {
        constructor(public value: string) {
        }
    }

    export function char(value: string) {
        return new ValChar(value);
    }

    export class ValPair {
        constructor(public a: Val, public d: Val) {
        }
    }

    export function pair(a: Val, d: Val) {
        return new ValPair(a, d);
    }

    export function list(...elems: Array<Val>): ValPair | ValSymbol {
        let result: ValPair | ValSymbol = SYMBOL_NIL;
        for (let i = elems.length - 1; i >= 0; i--) {
            result = pair(elems[i], result);
        }
        return result;
    }

    export class ValSymbol {
        constructor(public name: string) {
        }
    }

    export const SYMBOL_NIL = new ValSymbol("nil");
    export const SYMBOL_T = new ValSymbol("t");

    export function symbol(name: string) {
        return new ValSymbol(name);
    }

    export class ValFn {
        constructor(public fn: Target) {
        }
    }

    export class ValByteFn {
        constructor(public addr: number) {
        }
    }

    export function showVal(val: Val): string {
        if (val instanceof ValSymbol) {
            return val.name;
        }
        else if (val instanceof ValChar) {
            return "\\\\" + val.value;
        }
        else if (val instanceof ValPair) {
            // TODO: Also support the sugared form
            return \`(\${val.a} . \${val.d})\`;
        }
        else if (val instanceof ValFn) {
            return \`<fn: \${val.fn.name}>\`;
        }
        else if (val instanceof ValByteFn) {
            return \`<bytefn>\`;
        }
        else {
            let _coverageCheck: never = val;
            return _coverageCheck;
        }
    }

`;

