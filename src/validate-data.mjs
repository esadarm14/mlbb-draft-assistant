import { DATASET_NAMES, loadDatabase, validateDataset } from './data-store.mjs';
const db = await loadDatabase();
let count = 0;
for (const name of DATASET_NAMES) {
  validateDataset(name, db[name]);
  count += db[name].records.length;
  console.log(`${name}.json: ${db[name].records.length} records OK`);
}
console.log(`Validasi selesai: ${count} records; semua memiliki schema dan provenance yang dapat diterima.`);
