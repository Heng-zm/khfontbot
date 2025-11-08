// services/fontService.js

const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');
const dropbox = require('./dropboxService');

let fontCache = [];
// This object will store the current list a user is browsing (e.g., search results or all fonts)
let userSessionData = {};

function usingDropbox() {
  return dropbox.isEnabled();
}

function getLocalDirectory() {
  return process.env.FONT_DIRECTORY;
}

/**
 * Update the in-memory font cache from either local directory or Dropbox.
 */
async function initializeCache() {
  logger.info('Refreshing font cache...');
  try {
    if (usingDropbox()) {
      const names = await dropbox.syncCache();
      fontCache = names;
      logger.info(`Cache updated from Dropbox. Found ${fontCache.length} fonts.`);
    } else {
      const fontDirectory = getLocalDirectory();
      if (!fontDirectory || !fs.existsSync(fontDirectory)) {
        logger.error(`Font directory not found: ${fontDirectory}`);
        fontCache = [];
        return;
      }
      fontCache = fs.readdirSync(fontDirectory)
        .filter(file => /\.(ttf|otf)$/i.test(file))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
      logger.info(`Cache updated. Found ${fontCache.length} fonts.`);
    }
  } catch (error) {
    logger.error(`Failed to refresh font cache: ${error.message}`);
    fontCache = [];
  }
}

/**
 * Returns the full list of cached font filenames.
 */
function getFontCache() {
  return fontCache;
}

/**
 * Given a filename, return a local filesystem path that points to the font.
 * If Dropbox is enabled, this ensures the font is cached locally first.
 */
async function getFontPath(filename) {
  if (usingDropbox()) {
    await dropbox.ensureCached(filename);
    return dropbox.getCachedPath(filename);
  }
  return path.join(getLocalDirectory(), filename);
}

/**
 * Stores a list of fonts for a specific user's session.
 */
function setUserSession(chatId, files) {
  userSessionData[chatId] = files;
}

/**
 * Retrieves the list of fonts for a specific user's session.
 */
function getUserSession(chatId) {
  return userSessionData[chatId];
}

// Do not auto-run initializeCache here, callers should await it on startup

module.exports = {
  initializeCache,
  getFontCache,
  setUserSession,
  getUserSession,
  getFontPath,
  usingDropbox,
};
