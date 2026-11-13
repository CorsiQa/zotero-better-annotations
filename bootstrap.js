/* Better Annotations – bootstrap
 *
 * Zotero calls these functions when the plugin is installed, started, shut down
 * or uninstalled. The actual logic lives in content/*.js.
 */

/* global Zotero, Services, APP_SHUTDOWN, BetterAnnotations */

function install(data, reason) {}

async function startup({ id, version, rootURI }, reason) {
  await Zotero.initializationPromise;
  try {
    Services.scriptloader.loadSubScript(rootURI + "content/core.js");
    for (const lang of ["en", "de", "es", "fr", "it", "ja", "nb", "pl", "pt", "ru", "sv", "zh", "zh-TW"]) {
      try {
        Services.scriptloader.loadSubScript(rootURI + "content/locale/" + lang + ".js");
      }
      catch (e) {
        Zotero.logError(e); // missing language: English is used instead
      }
    }
    Services.scriptloader.loadSubScript(rootURI + "content/templates.js");
    Services.scriptloader.loadSubScript(rootURI + "content/library.js");
    Services.scriptloader.loadSubScript(rootURI + "content/export.js");
    Services.scriptloader.loadSubScript(rootURI + "content/reader.js");
    Services.scriptloader.loadSubScript(rootURI + "content/prefs-style.js");
    Services.scriptloader.loadSubScript(rootURI + "content/color-picker.js");
    Services.scriptloader.loadSubScript(rootURI + "content/prefs-ui.js");
    await BetterAnnotations.startup({ id, version, rootURI });
  }
  catch (e) {
    Zotero.logError(e);
  }
}

function onMainWindowLoad({ window }, reason) {}

function onMainWindowUnload({ window }, reason) {}

function shutdown(data, reason) {
  if (reason === APP_SHUTDOWN) {
    return;
  }
  try {
    if (typeof BetterAnnotations !== "undefined" && BetterAnnotations) {
      BetterAnnotations.shutdown();
    }
  }
  catch (e) {
    Zotero.logError(e);
  }
  BetterAnnotations = undefined;
}

function uninstall(data, reason) {
  // The data folder in the Zotero data directory is kept on purpose,
  // so that a reinstallation finds the profiles again.
}
