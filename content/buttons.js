// javascript for making the extra toolbar buttons work.


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

  downloadPanel: function(e) {
    if(e.button!=1) return;
    openNewTabWith("chrome://browser/content/downloads/downloadPanel.xul");
  },

  historyPanel: function(e) {
    if(e.button!=1) return;
    openNewTabWith("chrome://browser/content/history/history-panel.xul");
  },

  bookmarksPanel: function(e) {
    if(e.button!=1) return;
    openNewTabWith("chrome://browser/content/bookmarks/bookmarksPanel.xul");
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
  },

  stopOrReload: function(evt, button) {
    if(button.getAttribute('state')=='stop') BrowserStop();
    else if(evt.shiftKey) BrowserReloadSkipCache();
    else BrowserReload();
  },

  /** These functions control whether images, javascript, and plugins are allowed, and
    * apply to *the current tab only*. They take effect only after the page is refreshed.
    *
    * could also use the allowAuth, allowMetaRedirects and allowSubframes flags of docShell.
    */
  toggleJavascriptInTab: function() {
    var docShell = getBrowser().docShell;
    docShell.QueryInterface(Components.interfaces.nsIDocShell);
    docShell.allowJavascript = !docShell.allowJavascript;
  },
  toggleImagesInTab: function() {
    var docShell = getBrowser().docShell; // getBrowser() always gets the <browser> for the current tab
    docShell.QueryInterface(Components.interfaces.nsIDocShell); // just to be sure
    docShell.allowImages = !docShell.allowImages;
  },
  togglePluginsInTab: function() {
    var docShell = getBrowser().docShell;
    docShell.QueryInterface(Components.interfaces.nsIDocShell);
    docShell.allowPlugins = !docShell.allowPlugins;
  }
}




// combined Stop and Reload button.  (like Opera's one)
var tbxWebProgressListener = {
  stopReloadButton: null,

  listenerAdded: false,

  init: function() {
    this.stopReloadButton = document.getElementById('tbx-stopreload-button');
    if(this.stopReloadButton) {
      if(this.listenerAdded) return;
      gBrowser.addProgressListener(this, Components.interfaces.nsIWebProgress.NOTIFY_STATE_ALL);
//      gBrowser.addProgressListener(this, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
      this.listenerAdded = true;
      // default label is 'Stop/Reload', for when it's on the palette
      this.stopReloadButton.setAttribute('label',this.stopReloadButton.getAttribute('reloadlabel'));
    } else {
      if(!this.listenerAdded) return;
      gBrowser.removeProgressListener(this);
      this.listenerAdded = false;
    }
  },

  QueryInterface: function(aIID) {
    if(aIID.equals(Components.interfaces.nsIWebProgressListener)
        || aIID.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
    const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
    var btn = this.stopReloadButton;
    if(aStateFlags & nsIWebProgressListener.STATE_START) {
      btn.setAttribute('state','stop');
      btn.setAttribute('label',btn.getAttribute('stoplabel'));
      btn.setAttribute('tooltiptext',btn.getAttribute('stoptooltip'));
    } else if(aStateFlags & nsIWebProgressListener.STATE_STOP) {
      btn.removeAttribute('state');
      btn.setAttribute('label',btn.getAttribute('reloadlabel'));
      btn.setAttribute('tooltiptext',btn.getAttribute('reloadtooltip'));
    }
  },

  onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {},

  onLocationChange: function(aWebProgress, aRequest, aLocation) {},

  onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage) {},

  onSecurityChange: function(aWebProgress, aRequest, aState) {},

  // tabbrowser.xml#551 bogusly calls this for all registered progress listeners,
  // even though it is *not* part of the nsIWebProgressListener interface
  onLinkIconAvailable: function(href) {}
}



// code to make the per-tab toggle for images, javascript, plugins etc be checked/ticked at the right times
var tbxTabPrefToggles = {
  ids: [
    "tbx-javascript-tabpref",
    "tbx-images-tabpref",
    "tbx-plugins-tabpref"
  ],

  updaters: [
    function() { this.setAttribute("checked", getBrowser().docShell.allowJavascript); },
    function() { this.setAttribute("checked", getBrowser().docShell.allowImages);  },
    function() { this.setAttribute("checked", getBrowser().docShell.allowPlugins); }
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
  for(var i = 0; i < tbxTabPrefToggles.active.length; i++)
    tbxTabPrefToggles.active[i].update();
}
