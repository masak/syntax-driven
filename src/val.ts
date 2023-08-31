export type Val =
    ValChar |
    ValByteFn |
    ValPair |
    ValSymbol;

export class ValChar {
    constructor(public value: string) {
    }
}

export function char(value: string) {
    return new ValChar(value);
}

export class ValPair {
    constructor(public a: Val, public d: Val) {
    }
}

export function pair(a: Val, d: Val) {
    return new ValPair(a, d);
}

export function list(...elems: Array<Val>): ValPair | ValSymbol {
    let result: ValPair | ValSymbol = SYMBOL_NIL;
    for (let i = elems.length - 1; i >= 0; i--) {
        result = pair(elems[i], result);
    }
    return result;
}

export class ValSymbol {
    constructor(public name: string) {
    }
}

export const SYMBOL_NIL = new ValSymbol("nil");
export const SYMBOL_T = new ValSymbol("t");

export function symbol(name: string) {
    return new ValSymbol(name);
}

export class ValByteFn {
    constructor(public addr: number) {
    }
}

export function showVal(val: Val): string {
    if (val instanceof ValSymbol) {
        return val.name;
    }
    else if (val instanceof ValChar) {
        return "\\" + val.value;
    }
    else if (val instanceof ValPair) {
        // TODO: Also support the sugared form
        return `(${val.a} . ${val.d})`;
    }
    else if (val instanceof ValByteFn) {
        return `<bytefn ${val.addr.toString(16)}>`;
    }
    else {
        let _coverageCheck: never = val;
        return _coverageCheck;
    }
}

