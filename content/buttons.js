// javascript for making the extra toolbar buttons work.


var ToolbarExt = {
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
  }
}




// combined Stop and Reload button.  (like Opera's one)
var tbextStopReloadButton = {
  button: null,
  listenerAdded: false,
  
  init: function() {
    this.button = document.getElementById('toolbarext-stopreload');
    if(this.button) {
      if(this.listenerAdded) return;
      gBrowser.addProgressListener(this, Components.interfaces.nsIWebProgress.NOTIFY_STATE_ALL);
      this.listenerAdded = true;
      // default label is 'Stop/Reload', for when it's on the palette
      this.button.setAttribute('label',this.button.getAttribute('reloadlabel'));
    } else {
      if(!this.listenerAdded) return;
      gBrowser.removeProgressListener(this);
      this.listenerAdded = false;
    }
  },

  QueryInterface : function(aIID) {
    if(aIID.equals(Components.interfaces.nsIWebProgressListener)
        || aIID.equals(Components.interfaces.nsISupports))
      return this;
    throw Components.results.NS_NOINTERFACE;
  },

  onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus) {  
    const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
    var btn = this.button;
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

  onProgressChange: function (aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {},

  onLocationChange: function(aWebProgress, aRequest, aLocation) {},

  onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage) {},

  onSecurityChange: function(aWebProgress, aRequest, aState) {},
  
  // tabbrowser.xml#551 bogusly calls this for all registered progress listeners,
  // even though it is *not* part of the nsIWebProgressListener interface
  onLinkIconAvailable: function(href) {}
}


window.addEventListener("load",function(e){tbextStopReloadButton.init();}, false);
