import {
    Source,
} from "../compiler-src/source";

function source(contents: string): Source {
    return new Source(contents);
}

let sources = new Map<string, Source>([
    ["no", source(`
        (def no (x)
          (id x nil))
    `)],

    ["atom", source(`
        (def atom (x)
          (no (id (type x) 'pair)))
    `)],
]);

export default sources;

