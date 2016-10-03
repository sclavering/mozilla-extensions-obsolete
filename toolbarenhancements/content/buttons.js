var tbxCommands = {
  viewSource: function(e,doc) {
    if(e.button!=1) return;
    openNewTabWith("view-source:"+doc.location.href);
  },

  jsConsole: function(e) {
    if(e.button!=1) return;
    openNewTabWith("chrome://global/content/console.xul");
  },

  // 2nd one handles clicks, first one command events
  bookmarkManager: function(e) {
    toOpenWindowByType('bookmarks:manager','chrome://browser/content/bookmarks/bookmarksManager.xul');
  },
  bookmarkManager2: function(e) {
    if(e.button!=1) return;
    openNewTabWith('chrome://browser/content/bookmarks/bookmarksManager.xul');
  },

  historyPanel: function(e) {
    if(e.button!=1) return;
    openNewTabWith("chrome://browser/content/history/history-panel.xul");
  },

  bookmarksPanel: function(e) {
    if(e.button!=1) return;
    openNewTabWith("chrome://browser/content/bookmarks/bookmarksPanel.xul");
  },

  downloadsInTab: function(e) {
    if(e.button!=1) return;
    openNewTabWith("chrome://mozapps/content/downloads/downloads.xul");
  },

  clearCache: function() {
    var classID = Components.classes["@mozilla.org/network/cache-service;1"];
    var cacheService = classID.getService(Components.interfaces.nsICacheService);
    cacheService.evictEntries(Components.interfaces.nsICache.STORE_IN_MEMORY);
    cacheService.evictEntries(Components.interfaces.nsICache.STORE_ON_DISK);
  },

  // unused
  closeTab: function() {
    gBrowser.removeCurrentTab();
  }
}

// These functions control whether images, javascript, and plugins are allowed, and
// apply to *the current tab only*. Some take effect only after the page is refreshed.
function tbxToggleJavascriptInTab(btn) {
  var docShell = gBrowser.docShell;
  btn.setAttribute("ischecked", docShell.allowJavascript = !docShell.allowJavascript);
}
function tbxToggleImagesInTab(btn) {
  var docShell = gBrowser.docShell;
  btn.setAttribute("ischecked", docShell.allowImages = !docShell.allowImages);
}
function tbxToggleMetaRedirectsInTab(btn) {
  var docShell = gBrowser.docShell;
  btn.setAttribute("ischecked", docShell.allowMetaRedirects = !docShell.allowMetaRedirects);
}
function tbxTogglePluginsInTab(btn) {
  var docShell = gBrowser.docShell;
  btn.setAttribute("ischecked", docShell.allowPlugins = !docShell.allowPlugins);
}





// code to make the per-tab toggle for images, javascript, plugins etc be checked/ticked at the right times
var tbxTabPrefToggles = {
  ids: [
    "tbx-javascript-tabpref",
    "tbx-images-tabpref",
    "tbx-metaredirects-tabpref",
    "tbx-plugins-tabpref"
  ],

  updaters: [
    function() { this.setAttribute("ischecked", gBrowser.docShell.allowJavascript); },
    function() { this.setAttribute("ischecked", gBrowser.docShell.allowImages);  },
    function() { this.setAttribute("ischecked", gBrowser.docShell.allowMetaRedirects); },
    function() { this.setAttribute("ischecked", gBrowser.docShell.allowPlugins); }
  ],

  active: [],

  listenerAdded: false,

  init: function() {
    this.active = [];
    var anyActive = false
    for(var i = 0; i < this.ids.length; i++) {
      var check = document.getElementById(this.ids[i]);
      if(!check) continue; // this check might not be in use
      anyActive = true;
      check.update = this.updaters[i];
      this.active.push(check);
    }

    var appcontent = document.getElementById("appcontent");
    if(anyActive && !this.listenerAdded) {
      appcontent.addEventListener("select", tbxUpdateTabPrefToggles, false);
      this.listenerAdded = true;
    } else if(!anyActive && this.listenerAdded) {
      appcontent.removeEventListener("select", tbxUpdateTabPrefToggles, false);
      this.listenerAdded = false;
    }

    if(anyActive) tbxUpdateTabPrefToggles();
  }
}

function tbxUpdateTabPrefToggles(evt) {
  for(var i = 0; i != tbxTabPrefToggles.active.length; i++)
    tbxTabPrefToggles.active[i].update();
}
