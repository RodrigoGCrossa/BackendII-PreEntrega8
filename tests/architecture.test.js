import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(path.join(directory, entry.name)) : entry.name.endsWith('.js') ? [path.join(directory, entry.name)] : []))).flat();
}
test('Solo los DAO importan modelos; services y controllers respetan capas', async () => {
  for (const file of [...await files(path.join(root, 'src')), ...await files(path.join(root, 'scripts'))]) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    const source = await readFile(file, 'utf8');
    const imports = [...source.matchAll(/(?:from\s+|import\s*\(?)["']([^"']+)["']/g)].map((match) => match[1]);
    for (const specifier of imports) {
      if (specifier.includes('/models/')) assert.ok(relative.startsWith('src/dao/'), `${relative} importa modelo`);
      if (relative.startsWith('src/services/') || relative.startsWith('src/controllers/')) {
        assert.ok(!specifier.includes('/dao/') && !specifier.includes('/models/') && specifier !== 'mongoose', `${relative} salta una capa`);
      }
      if (specifier === 'mongoose') assert.ok(relative.startsWith('src/dao/') || relative.startsWith('src/models/'), `${relative} accede a Mongoose`);
    }
  }
});
test('Las tres entidades tienen DAO, Repository y DTO explícitos', async () => {
  for (const name of ['users', 'events', 'tickets']) for (const layer of ['dao', 'repositories']) {
    await readFile(path.join(root, 'src', layer, `${name}.${layer === 'dao' ? 'dao' : 'repository'}.js`));
  }
  for (const name of ['user', 'event', 'ticket']) await readFile(path.join(root, 'src/dto', `${name}.dto.js`));
});
