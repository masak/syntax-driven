import React from 'react';
import { useState } from 'react';

function stripSurroundingEmpty(s) {
    return s.replace(/^( )*\n/, "").replace(/\n( )*$/, "");
}

const EMPTY_LINE = /^\s*$/;

function deindent(s) {
    let lines = s.split(/\n/);
    let minIndent = 99;
    for (let line of lines) {
        if (EMPTY_LINE.test(line)) {
            continue;
        }
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

const rightPointingTriangle = "\u25B6";
const downPointingTriangle = "\u25BC";

const VISIBLE = {};
const HIDDEN = { display: "none" };

const SourceListing = (props) => {
    let [expanded, setExpanded] = useState(false);

    let sourceText = stripSurroundingEmpty(props.sourceText);
    sourceText = deindent(sourceText);

    function handleClick() {
        setExpanded(!expanded);
    }
    
    return (
      <div class="source-listing">
        <p onClick={handleClick}>
          {expanded ? downPointingTriangle : rightPointingTriangle}
          {" "}
          {props.fileName}:
        </p>
        <pre class="source-listing" style={expanded ? VISIBLE : HIDDEN}>
          <code>{sourceText}</code>
        </pre>
      </div>
    );
};

export default SourceListing;

