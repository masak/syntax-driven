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

export class Source {
    public name: string;
    public params: AstSymbol | AstList;
    public body: Array<Ast>;

    constructor(contents: string) {
        let func = parse(contents);
        if (func.length !== 1) {
            throw new Error(`Expected exactly 1 function, got ${func.length}`);
        }

        this.name = func[0].name;
        this.params = func[0].params;
        this.body = func[0].body;
    }
}

