import {
    Ast,
    parse,
} from "./parse-source";

export class Source {
    public name: string;
    public params: Ast.Symbol | Ast.List | Ast.DottedList;
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

