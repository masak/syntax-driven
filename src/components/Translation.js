import React from 'react';

const Translation = (props) => (
  let source = props.source
    .replace(/^( )*\n/, "")
    .replace(/\n( )*$/, "");

  let target = props.target
    .replace(/^( )*\n/, "")
    .replace(/\n( )*$/, "");

  <div class="translation">
    <pre><code>{source}</code></pre>
    <div class="arrow">→</div>
    <pre><code>{target}</code></pre>
  </div>
);

export default Translation;

