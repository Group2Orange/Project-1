// npm run reset restores the tracked sample data in your local working copy.
// Stop json-server first so its in-memory copy cannot overwrite the reset data.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');

const databasePath = path.join(__dirname, 'db.json');
const seedPath = path.join(__dirname, 'db.seed.json');

function isApiRunning() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: 3000 });
    const finish = running => {
      socket.destroy();
      resolve(running);
    };
    socket.setTimeout(700);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error('Cannot confirm the API is stopped: port 3000 check timed out. Reset cancelled.'));
    });
    socket.once('error', error => {
      if (error.code === 'ECONNREFUSED') return finish(false);
      socket.destroy();
      reject(new Error(`Cannot confirm the API is stopped (${error.code}). Reset cancelled.`));
    });
  });
}

async function resetDatabase() {
  if (await isApiRunning()) {
    throw new Error('Stop the API terminal (Ctrl+C) before running npm run reset. The running server keeps its database in memory.');
  }

  if (fs.existsSync(databasePath)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, `db.backup-${stamp}.json`);
    fs.copyFileSync(databasePath, backupPath);
    console.log(`Current database backed up to ${path.basename(backupPath)}`);
  }

  fs.copyFileSync(seedPath, databasePath);
  console.log('api/db.json was reset from api/db.seed.json');
}

resetDatabase().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
