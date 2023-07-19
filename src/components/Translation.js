import React from 'react';

const Translation = (props) => (
  <div class="translation">
    <pre><code>{props.source}</code></pre>
    <div class="arrow">→</div>
    <pre><code>{props.target}</code></pre>
  </div>
);

export default Translation;

