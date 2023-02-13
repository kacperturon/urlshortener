const express = require('express');
const crypto = require('crypto');

// length passed to crypto is in bytes
const possibleHashCombinations = (len) => (26 + 10) ** (len + 1);

const getRandomHash = (len) => crypto.createHash('shake256', { outputLength: len })
  .update(crypto.randomBytes(20).toString('hex')).digest('hex');

const app = express();
app.use(express.json());

const port = process.env.port || 3000;
const domain = `http://localhost:${port}`;
let hashLength = 1;
let combinationsAvailable = possibleHashCombinations(hashLength);
const hashes = new Set();
const urlHashes = {};

app.post('/shorten', (req, res) => {
  const { url, key } = req.body;
  let hash = null;
  let halt = false;

  if (!url || (key && hashes.has(key))) return res.sendStatus(403);
  if (key) hash = key;
  else {
    setTimeout(() => { halt = true; }, 1000 * 10);
    do {
      hash = getRandomHash(hashLength);
      if (halt) return res.sendStatus(500);
    } while (hashes.has(hash) || hash === null);
  }

  if (hashes.has(hash)) return res.sendStatus(403);

  hashes.add(hash);
  urlHashes[url] = urlHashes[url] ? [...urlHashes[url], hash] : [hash];
  combinationsAvailable -= 1;
  if (combinationsAvailable === 0) {
    hashLength += 1;
    combinationsAvailable = possibleHashCombinations(hashLength);
  }

  return res.send(`${domain}/${hash}`);
});

app.get('/:hash', (req, res) => {
  const { hash } = req.params;
  if (!hashes.has(hash)) return res.sendStatus(404);
  const url = Object.keys(urlHashes).find((u) => urlHashes[u].includes(hash));
  return res.redirect(url);
});

// eslint-disable-next-line no-console
app.listen(port, () => console.log(`Server: URL shortener started on port ${port}`));
