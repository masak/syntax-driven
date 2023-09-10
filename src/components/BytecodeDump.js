import React from 'react';

const xOffset = 10;
const yOffset = 10;
const width = 680;
const height = 50;
const padding = 4;
const bytesPerRow = 64;
const byteWidth = (width - 4 - 4) / bytesPerRow;
const byteHeight = 6;
const rowDistance = 20;

const headerColorScheme = [
    "#f60", "#f60", "#f70", "#f70",
    "#f80", "#f90", "#f90", "#fa0",
    "#fb0", "#fb0", "#fc0", "#fd0",
    "#fd0", "#fe0", "#fe0", "#ff0",
];

const internColorScheme = [
    "#888", "#888", "#999", "#999",
    "#aaa", "#aaa", "#bbb", "#bbb",
    "#ccc", "#ccc", "#ddd", "#ddd",
    "#eee", "#eee", "#fff", "#fff",
];

const stringColorScheme = [
    "#f60", "#e61", "#d72", "#c73",
    "#b84", "#a95", "#996", "#8a7",
    "#7b8", "#6b9", "#5ca", "#4db",
    "#3dc", "#2ed", "#1fe", "#0ff",
];

const bcfnColorScheme = [
    "#0ff", "#1ff", "#2ff", "#3ff",
    "#4ee", "#5ee", "#6ed", "#7dd",
    "#8dc", "#9cc", "#acb", "#bcb",
    "#cba", "#dba", "#eba", "#fba",
];

const BytecodeDump = (props) => {
    let boxes = [];
    let entries = props.dump.entries;
    let i = 0;
    for (let entry of entries) {
        let bytes = entry.bytes;
        for (let byte of bytes) {
            let x = xOffset + padding + (i % bytesPerRow) * byteWidth;
            let y = yOffset + padding +
                rowDistance * Math.floor(i / bytesPerRow);
            let colorIndex = Math.floor(byte / 16);
            let color = "#000";
            if (entry.type === "header") {
                color = headerColorScheme[colorIndex];
            }
            else if (entry.type === "intern") {
                color = internColorScheme[colorIndex];
            }
            else if (entry.type === "string") {
                color = stringColorScheme[colorIndex];
            }
            else if (entry.type === "global") {
                color = internColorScheme[colorIndex];
            }
            else if (entry.type === "bcfn") {
                color = bcfnColorScheme[colorIndex];
            }
            boxes.push(
                <rect x={x}
                      y={y}
                      width={byteWidth}
                      height={byteHeight}
                      fill={color}
                      stroke="none"
                />
            );
            i += 1;
        }
    }

    return (
      <svg class="bytecode-dump"
           width="700" height="70">
        <rect x={xOffset}
              y={yOffset}
              width={width}
              height={height}
              fill="white"
              stroke="black"
              stroke-width="2"
        />
        {boxes}
      </svg>
    );
};

export default BytecodeDump;

