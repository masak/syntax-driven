import React from 'react';

function stripSurroundingEmpty(s) {
    return s.replace(/^( )*\n/, "").replace(/\n( )*$/, "");
}

function deindent(s) {
    let lines = s.split(/\n/);
    let minIndent = 99;
    for (let line of lines) {
        let m = line.match(/^( *)/);
        let n = m[1].length;
        if (n < minIndent) {
            minIndent = n;
        }
    }
    return lines.map(
        (line) => line.substring(minIndent)
    ).join("\n");
}

const SourceListing = (props) => {
    let sourceText = stripSurroundingEmpty(props.sourceText);
    sourceText = deindent(sourceText);
    
    return (
      <div class="source-listing">
        <pre><code>{sourceText}</code></pre>
      </div>
    );
};

export default SourceListing;

