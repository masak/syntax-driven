import {
    Source,
} from "../src/source";

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

    ["all", source(`
        (def all (f xs)
          (if (no xs)      t
              (f (car xs)) (all f (cdr xs))
                           nil))
    `)],
]);

export default sources;

