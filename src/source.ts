import {
    parse,
} from "./parse-source";

export type Ast =
    AstList |
    AstQuote |
    AstSymbol;

export class AstList {
    constructor(public elems: Array<Ast>) {
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

export class Source {
    public name: string;
    public params: AstSymbol | AstList;
    public body: Array<Ast>;

    constructor(contents: string) {
        [this.name, this.params, this.body] = parse(contents);
    }
}

