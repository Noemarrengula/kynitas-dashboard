const fs = require('node:fs');

const file = 'dist/index.html';
fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/ crossorigin(="[^"]*")?/g, ''));