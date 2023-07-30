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
        this.body = this.body
            .replace(/^\s+/, "")
            .replace(/\s+$/, "");
    }
}

export function stringifyTarget({ name, header, body }: Target): string {
    let headerDesc = `[req: ${header.req}; reg: ${header.reg}]`;
    return `bcfn ${name} ${headerDesc}` + "\n" + body;
}

