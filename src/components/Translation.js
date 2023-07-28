import React from 'react';

import Keyword from './Keyword';

function stripSurroundingEmpty(s) {
    return s.replace(/^( )*\n/, "").replace(/\n( )*$/, "");
}

function deindent(s) {
    let lines = s.split(/\n/);
    let minIndent = 99;
    for (let line of lines) {
        let m = line.match(/^( *)/);
        let n = m[1].length;
        if (n < minIndent) {
            minIndent = n;
        }
    }
    return lines.map(
        (line) => line.substring(minIndent)
    ).join("\n");
}

var Ev;
(function (Ev) {
    class OpenParen {
    }
    Ev.OpenParen = OpenParen;

    class Ast {
        constructor(ast) {
            this.ast = ast;
        }
    }
    Ev.Ast = Ast;

    class Dot {
    }
    Ev.Dot = Dot;

    class Quot {
    }
    Ev.Quot = Quot;
})(Ev || (Ev = {}));

var Ast;
(function (Ast) {
    class Func {
        constructor(name, params, body) {
            this.name = name;
            this.params = params;
            this.body = body;
        }
    }
    Ast.Func = Func;

    class List {
        constructor(elems) {
            this.elems = elems;
        }
    }
    Ast.List = List;

    class DottedList {
        constructor(regularElems, lastElem) {
            this.regularElems = regularElems;
            this.lastElem = lastElem;
        }
    }
    Ast.DottedList = DottedList;

    class Quote {
        constructor(datum) {
            this.datum = datum;
        }
    }
    Ast.Quote = Quote;

    class Symbol {
        constructor(name) {
            this.name = name;
        }
    }
    Ast.Symbol = Symbol;
})(Ast || (Ast = {}));

const WHITESPACE = /^[\s\n]*/;
const SYMBOL = /^\w+/;

function isSymbolOfName(ast, name) {
    return ast instanceof Ast.Symbol && ast.name === name;
}

function isSymbol(ast) {
    return ast instanceof Ast.Symbol;
}

function isParams(ast) {
    return ast instanceof Ast.Symbol ||
        ast instanceof Ast.List ||
        ast instanceof Ast.DottedList;
}

function extractElems(stack) {
    let elems = [];
    while (stack.length > 0) {
        let elem = stack.pop();
        if (elem instanceof Ev.Quot) {
            if (elems.length === 0) {
                throw new Error("Quote marker without datum");
            }
            let datum = elems.shift();
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

function toAst(ev) {
    if (ev instanceof Ev.Ast) {
        return ev.ast;
    }
    else {
        throw new Error(`Not an AST: ${ev.constructor.name}`);
    }
}

function toFunc(ev) {
    if (ev instanceof Ev.Ast) {
        if (ev.ast instanceof Ast.Func) {
            return ev.ast;
        }
        else {
            console.log(ev.ast);
            throw new Error(`Not a function: ${ev.ast.constructor.name}`);
        }
    }
    throw new Error(`Not a function: ${ev.constructor.name}`);
}

function parse(input) {
    let stack = [];
    let pos = 0;
    while (pos < input.length) {
        let whitespaceLength = WHITESPACE.exec(input.substring(pos));
        pos += whitespaceLength[0].length;
        if (pos >= input.length) {
            break;
        }
        let m;
        if (input.charAt(pos) === "(") {
            stack.push(new Ev.OpenParen());
            pos += 1;
        }
        else if (input.charAt(pos) === ")") {
            let elems = extractElems(stack);
            let dotIndex = elems.findIndex((e) => e instanceof Ev.Dot);
            let list;
            if (dotIndex !== -1 && dotIndex < elems.length - 2) {
                throw new Error("Dot too early in list");
            }
            else if (dotIndex > elems.length - 2) {
                throw new Error("Dot too late in list");
            }
            else if (dotIndex === -1) {
                list = new Ast.List(elems.map(toAst));
            }
            else { // dotIndex === elems.length - 2
                let regularElems = elems.slice(0, dotIndex).map(toAst);
                let lastElem = toAst(elems[elems.length - 1]);
                list = new Ast.DottedList(regularElems, lastElem);
            }
            let isFunctionDefinition = elems.length > 0 &&
                toAst(elems[0]) instanceof Ast.Symbol &&
                toAst(elems[0]).name === "def";
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
            else { // regular case, create a list
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
        else if ((m = SYMBOL.exec(input.substring(pos)))) {
            let name = m[0];
            stack.push(new Ev.Ast(new Ast.Symbol(name)));
            pos += name.length;
        }
        else {
            let fragment = input.substring(pos, pos + 10);
            throw new Error(`Unrecognized input: '${fragment}'`);
        }
    }
    let funcs = stack.map(toFunc);
    return funcs;
}

function prettySerialize(funcs) {
    let result = [];
    function serializeExpr(expr) {
        if (expr instanceof Ast.Symbol) {
            result.push(expr.name);
        }
        else if (expr instanceof Ast.Func) {
            result.push("###func###");
        }
        else if (expr instanceof Ast.Quote) {
            result.push("'");
            serializeExpr(expr.datum);
        }
        else if (expr instanceof Ast.List) {
            result.push("(");
            let i = 0;
            for (let elem of expr.elems) {
                serializeExpr(elem);
                if (i < expr.elems.length - 1) {
                    result.push(" ");
                }
                ++i;
            }
            result.push(")");
        }
        else if (expr instanceof Ast.DottedList) {
            result.push("(");
            for (let elem of expr.regularElems) {
                serializeExpr(elem);
                result.push(" ");
            }
            result.push(". ");
            serializeExpr(expr.lastElem);
            result.push(")");
        }
        else {
            let _coverageCheck = expr;
            return _coverageCheck;
        }
    }
    for (let func of funcs) {
        result.push("(");
        result.push(
          <Keyword>def</Keyword>
        );
        result.push(` ${func.name} `);
        serializeExpr(func.params);
        result.push("\n  ");
        for (let stmt of func.body) {
            serializeExpr(stmt);
        }
        result.push(")");
    }
    return result;
}

const Translation = (props) => {
    let source = stripSurroundingEmpty(props.source);
    source = deindent(source);
    source = prettySerialize(parse(source));
    
    let target = stripSurroundingEmpty(props.target);
    target = deindent(target);
    
    return (
      <div class="translation">
        <pre><code>{source}</code></pre>
        <div class="arrow">→</div>
        <pre><code>{target}</code></pre>
      </div>
    );
};

export default Translation;

