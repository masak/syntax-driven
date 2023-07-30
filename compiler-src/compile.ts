import {
    Source,
} from "./source";
import {
    Env,
} from "./env";
import {
    Target,
} from "./target";

type ActualAst = Ast;

type Ev =
    Ev.OpenParen |
    Ev.Ast |
    Ev.Dot |
    Ev.Quot;

namespace Ev {
    export class OpenParen {
    }

    export class Ast {
        constructor(public ast: ActualAst) {
        }
    }

    export class Dot {
    }

    export class Quot {
    }
}

type Ast =
    Ast.Func |
    Ast.List |
    Ast.DottedList |
    Ast.Quote |
    Ast.Symbol;

namespace Ast {
    export class Func {
        constructor(
            public name: string,
            public params: Ast.Symbol | Ast.List | Ast.DottedList,
            public body: Array<Ast>) {
        }
    }

    export class List {
        constructor(public elems: Array<Ast>,) {
        }
    }

    export class DottedList {
        constructor(public regularElems: Array<Ast>, public lastElem: Ast) {
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

function isParams(ast: Ast): ast is Ast.Symbol | Ast.List | Ast.DottedList {
    return ast instanceof Ast.Symbol ||
        ast instanceof Ast.List ||
        ast instanceof Ast.DottedList;
}

function extractElems(stack: Array<Ev>): Array<Ev.Ast | Ev.Dot> {
    let elems: Array<Ev.Ast | Ev.Dot> = [];
    while (stack.length > 0) {
        let elem = stack.pop()!;
        if (elem instanceof Ev.Quot) {
            if (elems.length === 0) {
                throw new Error("Quote marker without datum");
            }
            let datum = elems.shift()!;
            if (datum instanceof Ev.Dot) {
                throw new Error("Can't quote a dot");
            }
            let quote = new Ast.Quote(datum.ast);
            elems.unshift(new Ev.Ast(quote));
        }
        else if (elem instanceof Ev.OpenParen) {
            return elems;
        }
        else {
            elems.unshift(elem);
        }
    }
    throw new Error("Closing ')' without opening '('");
}

function toAst(ev: Ev): Ast {
    if (ev instanceof Ev.Ast) {
        return ev.ast;
    }
    else {
        throw new Error(`Not an AST: ${ev.constructor.name}`);
    }
}

function toFunc(ev: Ev): Ast.Func {
    if (ev instanceof Ev.Ast) {
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

function parse(input: string): Array<Ast.Func> {
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
            stack.push(new Ev.OpenParen());
            pos += 1;
        }
        else if (input.charAt(pos) === ")") {
            let elems = extractElems(stack);
            let dotIndex = elems.findIndex((e) => e instanceof Ev.Dot);
            let list: Ast.List | Ast.DottedList;
            if (dotIndex !== -1 && dotIndex < elems.length - 2) {
                throw new Error("Dot too early in list");
            }
            else if (dotIndex > elems.length - 2) {
                throw new Error("Dot too late in list");
            }
            else if (dotIndex === -1) {
                list = new Ast.List(elems.map(toAst));
            }
            else {  // dotIndex === elems.length - 2
                let regularElems = elems.slice(0, dotIndex).map(toAst);
                let lastElem = toAst(elems[elems.length - 1]);
                list = new Ast.DottedList(regularElems, lastElem);
            }
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
                stack.push(new Ev.Ast(new Ast.Func(funcSymbol.name, params, body)));
            }
            else {         // regular case, create a list
                stack.push(new Ev.Ast(list));
            }
            pos += 1;
        }
        else if (input.charAt(pos) === "'") {
            stack.push(new Ev.Quot());
            pos += 1;
        }
        else if (input.charAt(pos) === ".") {
            stack.push(new Ev.Dot());
            pos += 1;
        }
        else if (m = SYMBOL.exec(input.substring(pos))!) {
            let name = m[0];
            stack.push(new Ev.Ast(new Ast.Symbol(name)));
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

export function compile(source: Source, env: Env): Target {
    let func = parse(source.contents);
    if (func.length !== 1) {
        throw new Error(`Expected exactly 1 function, got ${func.length}`);
    }

    return new Target(
        func[0].name,
        { req: "wrong", reg: "also wrong" },
        "the instructions have been fired",
    );
}

