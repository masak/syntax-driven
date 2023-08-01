export type Val =
    ValSymbol;

export class ValSymbol {
    constructor(public name: string) {
    }
}

export const SYMBOL_NIL = new ValSymbol("nil");
export const SYMBOL_T = new ValSymbol("t");

export function symbol(name: string) {
    return new ValSymbol(name);
}

export function showVal(val: Val): string {
    if (val instanceof ValSymbol) {
        return val.name;
    }
    else {
        let _coverageCheck: never = val;
        return _coverageCheck;
    }
}

