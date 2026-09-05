const fs = require('fs');
const path = require('path');
const { RETENTION_DAYS } = require('./config');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'news.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

function loadAll() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveAll(items) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf8');
}

// 새 항목을 저장하고, 이번에 새로 추가된 항목만 반환한다.
function addNewItems(newItems) {
  const all = loadAll();
  const existingLinks = new Set(all.map((i) => i.link));
  const added = [];
  const fetchedAt = new Date().toISOString();

  for (const item of newItems) {
    if (existingLinks.has(item.link)) continue;
    existingLinks.add(item.link);
    const record = { ...item, fetchedAt };
    all.push(record);
    added.push(record);
  }

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const trimmed = all.filter((i) => new Date(i.fetchedAt).getTime() >= cutoff);
  trimmed.sort((a, b) => new Date(b.fetchedAt) - new Date(a.fetchedAt));

  saveAll(trimmed);
  return added;
}

function getItemsSince(sinceDate) {
  return loadAll().filter((i) => new Date(i.fetchedAt).getTime() >= sinceDate.getTime());
}

module.exports = { loadAll, addNewItems, getItemsSince, DATA_FILE };
