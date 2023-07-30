export interface Header {
    req: string;
    reg: string;
}

export class Target {
    constructor(
        public name: string,
        public header: Header,
        public body: string,
    ) {
    }
}

export function stringifyTarget(target: Target): string {
    return "<this string intentionally left empty>";
}

