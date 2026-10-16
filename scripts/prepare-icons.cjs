#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'public', 'icons', 'icon-512.png');
const output = path.join(root, 'build-desktop', 'icons');

async function png(size) {
  return sharp(source).resize(size, size, { fit: 'contain' }).png().toBuffer();
}

// Modern Windows supports PNG entries in ICO containers. Generate the container
// ourselves to avoid downloading conversion tools or requiring platform SDKs.
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  for (let index = 0; index < images.length; index += 1) {
    const { size, data } = images[index];
    const position = 6 + index * 16;
    header[position] = size === 256 ? 0 : size;
    header[position + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, position + 4);
    header.writeUInt16LE(32, position + 6);
    header.writeUInt32LE(data.length, position + 8);
    header.writeUInt32LE(offset, position + 12);
    offset += data.length;
  }
  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

function icns(images) {
  const chunks = images.map(({ type, data }) => {
    const header = Buffer.alloc(8);
    header.write(type, 0, 4, 'ascii');
    header.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([header, data]);
  });
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(8 + chunks.reduce((size, chunk) => size + chunk.length, 0), 4);
  return Buffer.concat([header, ...chunks]);
}

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const sizes = [16, 32, 48, 64, 128, 256, 512, 1024];
  const images = new Map(await Promise.all(sizes.map(async (size) => [size, await png(size)])));
  fs.writeFileSync(path.join(output, 'icon.png'), images.get(512));
  fs.writeFileSync(path.join(output, 'icon.ico'), ico([16, 32, 48, 64, 128, 256].map((size) => ({ size, data: images.get(size) }))));
  fs.writeFileSync(path.join(output, 'icon.icns'), icns([
    { type: 'icp4', data: images.get(16) },
    { type: 'icp5', data: images.get(32) },
    { type: 'icp6', data: images.get(64) },
    { type: 'ic07', data: images.get(128) },
    { type: 'ic08', data: images.get(256) },
    { type: 'ic09', data: images.get(512) },
    { type: 'ic10', data: images.get(1024) },
  ]));
  console.log(`Desktop icons prepared: ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
