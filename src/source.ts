import {
    parse,
} from "./parse-source";

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
        let { name, params, body } = parse(contents);

        this.name = name;
        this.params = params;
        this.body = body;
    }
}

