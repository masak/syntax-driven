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

    has(bindingName: string): boolean {
        return this.bindings.has(bindingName);
    }
}
