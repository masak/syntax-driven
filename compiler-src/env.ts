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

    install(source: Source) {
        let target = compile(source, this);
        return new Env(
            new Map([
                ...this.bindings.entries(),
                [target.name, target],
            ]),
        );
    }
}

