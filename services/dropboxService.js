// services/dropboxService.js

const fs = require('fs');
const path = require('path');
const { Dropbox } = require('dropbox');
const fetch = require('node-fetch');
const { logger } = require('./logger');

const USE_DROPBOX = String(process.env.USE_DROPBOX || '').toLowerCase() === 'true';
const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN || '';
const DROPBOX_FOLDER = process.env.DROPBOX_FOLDER || '/Fonts';
const CACHE_DIR = path.join(__dirname, '..', '.cache', 'fonts');

function isEnabled() {
  return USE_DROPBOX && !!DROPBOX_ACCESS_TOKEN;
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getClient() {
  if (!isEnabled()) {
    throw new Error('Dropbox is not enabled or missing access token');
  }
  return new Dropbox({ accessToken: DROPBOX_ACCESS_TOKEN, fetch });
}

async function listRemoteFonts() {
  if (!isEnabled()) return [];
  const dbx = getClient();
  let entries = [];
  let hasMore = true;
  let cursor = null;
  try {
    let res = await dbx.filesListFolder({ path: DROPBOX_FOLDER, recursive: false });
    entries = entries.concat(res.result.entries || []);
    hasMore = res.result.has_more;
    cursor = res.result.cursor;
    while (hasMore) {
      const cont = await dbx.filesListFolderContinue({ cursor });
      entries = entries.concat(cont.result.entries || []);
      hasMore = cont.result.has_more;
      cursor = cont.result.cursor;
    }
  } catch (e) {
    logger.error(`Dropbox list error: ${e.message}`);
    return [];
  }
  return entries
    .filter(e => e['.tag'] === 'file')
    .map(f => ({ name: f.name, path_lower: f.path_lower, id: f.id, rev: f.rev || '', size: f.size || 0 }))
    .filter(f => /\.(ttf|otf)$/i.test(f.name));
}

function getCachedPath(filename) {
  return path.join(CACHE_DIR, filename);
}

async function downloadToCache(filename) {
  const dbx = getClient();
  ensureCacheDir();
  const outPath = getCachedPath(filename);
  try {
    const dl = await dbx.filesDownload({ path: `${DROPBOX_FOLDER}/${filename}` });
    const ab = dl.result.fileBinary; // ArrayBuffer
    const buf = Buffer.from(ab);
    fs.writeFileSync(outPath, buf);
    return outPath;
  } catch (e) {
    logger.error(`Dropbox download failed for ${filename}: ${e.message}`);
    throw e;
  }
}

async function ensureCached(filename) {
  ensureCacheDir();
  const p = getCachedPath(filename);
  if (fs.existsSync(p)) return p;
  return downloadToCache(filename);
}

async function uploadFromLocal(localPath, destFileName) {
  const dbx = getClient();
  const contents = fs.readFileSync(localPath);
  try {
    await dbx.filesUpload({ path: `${DROPBOX_FOLDER}/${destFileName}`, contents, mode: { '.tag': 'add' } });
    return true;
  } catch (e) {
    // On name conflict, overwrite
    try {
      await dbx.filesUpload({ path: `${DROPBOX_FOLDER}/${destFileName}`, contents, mode: { '.tag': 'overwrite' } });
      return true;
    } catch (err) {
      logger.error(`Dropbox upload failed for ${destFileName}: ${err.message}`);
      return false;
    }
  }
}

async function syncCache() {
  if (!isEnabled()) return [];
  ensureCacheDir();
  const remote = await listRemoteFonts();
  for (const f of remote) {
    const p = getCachedPath(f.name);
    if (!fs.existsSync(p)) {
      try { await downloadToCache(f.name); } catch (_) {}
    }
  }
  return remote.map(f => f.name).sort((a,b)=>a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

module.exports = {
  isEnabled,
  getCachedPath,
  ensureCached,
  listRemoteFonts,
  syncCache,
  uploadFromLocal,
  CACHE_DIR,
};