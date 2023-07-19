import React from 'react';

function stripSurroundingEmpty(s) {
  return s.
    .replace(/^( )*\n/, "")
    .replace(/\n( )*$/, "");
}

function deindent(s) {
  let lines = s.split(/\n/);
  let minIndent = 99;
  for (let line of lines) {
    let m = s.match(/^( *)/);
    let n = m[1].length;
    if (n < minIndent) {
      minIndent = n;
    }
  }
  return lines.map(
    (line) => line.substring(minIndent)
  ).join("\n");
}

const Translation = (props) => (
  let source = stripSurroundingEmpty(props.source);
  source = deindent(source);

  let target = stripSurroundingEmpty(props.target);
  target = deindent(target);

  <div class="translation">
    <pre><code>{source}</code></pre>
    <div class="arrow">→</div>
    <pre><code>{target}</code></pre>
  </div>
);

export default Translation;

