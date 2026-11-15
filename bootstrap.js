/* Better Annotations – bootstrap
 *
 * Zotero calls these functions when the plugin is installed, started, shut down
 * or uninstalled. The actual logic lives in content/*.js.
 */

/* global Zotero, Services, Components, APP_SHUTDOWN, BetterAnnotations */

var chromeHandle = null;

function install(data, reason) {}

async function startup({ id, version, rootURI }, reason) {
  await Zotero.initializationPromise;
  try {
    // chrome://better-annotations/content/ for the separate labels window
    const aomStartup = Components.classes["@mozilla.org/addons/addon-manager-startup;1"]
      .getService(Components.interfaces.amIAddonManagerStartup);
    const manifestURI = Services.io.newURI(rootURI + "manifest.json");
    chromeHandle = aomStartup.registerChrome(manifestURI, [["content", "better-annotations", "content/"]]);
  }
  catch (e) {
    Zotero.logError(e);
  }
  try {
    Services.scriptloader.loadSubScript(rootURI + "content/core.js");
    for (const lang of ["en", "de", "es", "fr", "it", "ja", "pl", "pt", "ru", "zh", "zh-TW"]) {
      try {
        Services.scriptloader.loadSubScript(rootURI + "content/locale/" + lang + ".js");
      }
      catch (e) {
        Zotero.logError(e); // missing language: English is used instead
      }
    }
    Services.scriptloader.loadSubScript(rootURI + "content/templates.js");
    Services.scriptloader.loadSubScript(rootURI + "content/library.js");
    Services.scriptloader.loadSubScript(rootURI + "content/profiles.js");
    Services.scriptloader.loadSubScript(rootURI + "content/export.js");
    Services.scriptloader.loadSubScript(rootURI + "content/reader.js");
    Services.scriptloader.loadSubScript(rootURI + "content/panel.js");
    Services.scriptloader.loadSubScript(rootURI + "content/prefs-style.js");
    Services.scriptloader.loadSubScript(rootURI + "content/color-picker.js");
    Services.scriptloader.loadSubScript(rootURI + "content/prefs-ui.js");
    await BetterAnnotations.startup({ id, version, rootURI });
  }
  catch (e) {
    Zotero.logError(e);
  }
}

function onMainWindowLoad({ window }, reason) {
  try {
    BetterAnnotations?.Panel?.onMainWindowLoad(window);
  }
  catch (e) {
    Zotero.logError(e);
  }
}

function onMainWindowUnload({ window }, reason) {
  try {
    BetterAnnotations?.Panel?.onMainWindowUnload(window);
  }
  catch (e) {
    Zotero.logError(e);
  }
}

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
  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
  BetterAnnotations = undefined;
}

function uninstall(data, reason) {
  // The data folder in the Zotero data directory is kept on purpose,
  // so that a reinstallation finds the profiles again.
}
