// these functions are all for middle-click events only
const ToolbarExt = {
  viewSource: function(e,doc) {
    if(e.button!=1) return;
    openNewTabWith("view-source:"+doc.location.href);
  },
  
  jsConsole: function(e) {
    if(e.button!=1) return;
    openNewTabWith("chrome://global/content/console.xul");
  },
  
  bookmarkManager: function(e) {
    if(e.button==1) {
      openNewTabWith('chrome://browser/content/bookmarks/bookmarksManager.xul');
    } else {
      toOpenWindowByType('bookmarks:manager','chrome://browser/content/bookmarks/bookmarksManager.xul');
    }
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
  }
}
