import {
    Header,
    Target,
} from "../compiler-src/target";

function target(name: string, header: Header, body: string): Target {
    return new Target(name, header, body);
}

let expectedTargets = new Map<string, Target>([
    ["no", target(
        "no",
        { req: "%0", reg: "%0..%1" },
        `
            %1 ← (id %0 nil)
            return %1
        `,
    )],

    ["atom", target(
        "atom",
        { req: "%0", reg: "%0..%4" },
        `
            %1 ← (get-global "no")
            %2 ← (type %0)
            %3 ← (id %2 'pair)
            %4 ← (id %3 nil)
            return %4
        `,
    )],
]);

export default expectedTargets;

