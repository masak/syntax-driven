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

    has(name: string): boolean {
        return this.bindings.has(name);
    }

    get(name: string): Target {
        let target = this.bindings.get(name);
        if (target === undefined) {
            throw new Error(`Cannot find target '${name}' in environment`);
        }
        return target;
    }
}

