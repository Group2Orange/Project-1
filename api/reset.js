// npm run reset restores the tracked sample data in your local working copy.
const fs = require('node:fs');
const path = require('node:path');

fs.copyFileSync(path.join(__dirname, 'db.seed.json'), path.join(__dirname, 'db.json'));
console.log('api/db.json was reset from api/db.seed.json');
