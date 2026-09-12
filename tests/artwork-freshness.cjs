const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {buildArtwork,assets} = require('../tools/build-artwork.cjs');

const root=path.resolve(__dirname,'..');
const generated=buildArtwork();
const committed=fs.readFileSync(path.join(root,'artwork.js'),'utf8');
assert.equal(committed,generated,'artwork.js is stale; run node tools/build-artwork.cjs');
assert.equal(assets.filter(a=>a.kind==='finial').length,5);
assert.equal(assets.filter(a=>a.kind==='post').length,3);
console.log('Artwork freshness and deterministic sanitization passed.');
