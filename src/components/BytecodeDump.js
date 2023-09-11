import React from 'react';

const xOffset = 10;
const yOffset = 10;
const width = 680;
const height = 28;
const padding = 4;
const bytesPerRow = 64;
const byteWidth = (width - 4 - 4) / bytesPerRow;
const byteHeight = 6;
const rowDistance = 12;

function clamp(v) {
    return v < 0
        ? 0
        : v > 255
            ? 255
            : v;
}

function interpolate(lowRgb, highRgb, byte) {
    let val = byte / 255;
    let r = lowRgb[0] * (1 - val) + highRgb[0] * val;
    let g = lowRgb[1] * (1 - val) + highRgb[1] * val;
    let b = lowRgb[2] * (1 - val) + highRgb[2] * val;
    let rValue = clamp(Math.floor(256 * r));
    let gValue = clamp(Math.floor(256 * g));
    let bValue = clamp(Math.floor(256 * b));
    return `rgb(${rValue}, ${gValue}, ${bValue})`;
}

function headerColor(byte) {
    return interpolate([1.00, .25, .25], [1.00, 1.00, .75], byte);
}

function internColor(byte) {
    return interpolate([1.00, .75, .25], [.75, 1.00, .75], byte);
}

function stringColor(byte) {
    return interpolate([.25, .75, .25], [.50, .75, 1.00], byte);
}

function globalColor(byte) {
    return interpolate([.25, .50, .75], [.75, .75, 1.00], byte);
}

function bcfnHeaderColor(byte) {
    return interpolate([.25, .25, 1.00], [1.00, .75, 1.00], byte);
}

function bcfnColor(byte) {
    return interpolate([.75, .25, .75], [1.00, .75, .75], byte);
}

const BytecodeDump = (props) => {
    let boxes = [];
    let entries = props.dump.entries;
    let i = 0;
    for (let entry of entries) {
        let bytes = entry.bytes;
        let byteOffset = 0;
        for (let byte of bytes) {
            let x = xOffset + padding + (i % bytesPerRow) * byteWidth;
            let y = yOffset + padding +
                rowDistance * Math.floor(i / bytesPerRow);
            let color = "#000";
            if (entry.type === "header") {
                color = headerColor(byte);
            }
            else if (entry.type === "intern") {
                color = internColor(byte);
            }
            else if (entry.type === "string") {
                color = stringColor(byte);
            }
            else if (entry.type === "global") {
                color = globalColor(byte);
            }
            else if (entry.type === "bcfn") {
                if (byteOffset < 4) {
                    color = bcfnHeaderColor(byte);
                }
                else {
                    color = bcfnColor(byte);
                }
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
            byteOffset += 1;
        }
    }

    return (
      <svg class="bytecode-dump"
           width="100%"
           viewBox="0 0 700 70">
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

