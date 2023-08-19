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

const WHITESPACE = /^[\s\n]*/;
const SYMBOL = /^\w+/;

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
        throw new Error(`Not an AST: ${ev.constructor.name}`);
    }
}

function toFunc(ev: Ev): AstFunc {
    if (ev instanceof EvTree) {
        if (ev.ast instanceof AstFunc) {
            return ev.ast as AstFunc;
        }
        else {
            throw new Error(`Not a function: ${ev.ast.constructor.name}`);
        }
    }
    throw new Error(`Not a function: ${ev.constructor.name}`);
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
            throw new Error(`Unrecognized input: '${fragment}'`);
        }
    }

    let funcs: Array<AstFunc> = stack.map(toFunc);
    return funcs;
}

