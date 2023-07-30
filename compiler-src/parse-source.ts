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
    Ast.Func |
    Ast.List |
    Ast.Quote |
    Ast.Symbol;

export namespace Ast {
    export class Func {
        constructor(
            public name: string,
            public params: Ast.Symbol | Ast.List,
            public body: Array<Ast>) {
        }
    }

    export class List {
        constructor(public elems: Array<Ast>,) {
        }
    }

    export class Quote {
        constructor(public datum: Ast) {
        }
    }

    export class Symbol {
        constructor(public name: string) {
        }
    }
}

const WHITESPACE = /^[\s\n]*/;
const SYMBOL = /^\w+/;

function isSymbolOfName(ast: Ast, name: string): boolean {
    return ast instanceof Ast.Symbol && ast.name === name;
}

function isSymbol(ast: Ast): ast is Ast.Symbol {
    return ast instanceof Ast.Symbol;
}

function isParams(ast: Ast): ast is Ast.Symbol | Ast.List {
    return ast instanceof Ast.Symbol ||
        ast instanceof Ast.List;
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
            let quote = new Ast.Quote(datum.ast);
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

function toFunc(ev: Ev): Ast.Func {
    if (ev instanceof EvTree) {
        if (ev.ast instanceof Ast.Func) {
            return ev.ast as Ast.Func;
        }
        else {
            console.log(ev.ast);
            throw new Error(`Not a function: ${ev.ast.constructor.name}`);
        }
    }
    throw new Error(`Not a function: ${ev.constructor.name}`);
}

export function parse(input: string): Array<Ast.Func> {
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
            let list = new Ast.List(elems.map(toAst));
            let isFunctionDefinition = elems.length > 0 &&
                toAst(elems[0]) instanceof Ast.Symbol &&
                (toAst(elems[0]) as Ast.Symbol).name === "def";
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
                stack.push(new EvTree(new Ast.Func(funcSymbol.name, params, body)));
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
            stack.push(new EvTree(new Ast.Symbol(name)));
            pos += name.length;
        }
        else {
            let fragment = input.substring(pos, pos + 10);
            throw new Error(`Unrecognized input: '${fragment}'`);
        }
    }

    let funcs: Array<Ast.Func> = stack.map(toFunc);
    return funcs;
}

