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




// replacement start-customisation function that passes all our toolboxes as args to the window

function ToolbarExt_BrowserCustomizeToolbar() {
  // Disable the toolbar context menu items
  var menubar = document.getElementById("main-menubar");
  for (var i = 0; i < menubar.childNodes.length; ++i)
    menubar.childNodes[i].setAttribute("disabled", true);
    
  var cmd = document.getElementById("cmd_CustomizeToolbars");
  cmd.setAttribute("disabled", "true");
  
  var navbox = document.getElementById("navigator-toolbox");
  var bottomBox = document.getElementById("toolbarext-bottom-toolbox");
  var leftBox = document.getElementById("toolbarext-left-toolbox");
  var rightBox = document.getElementById("toolbarext-right-toolbox");
  window.openDialog("chrome://global/content/customizeToolbar.xul", "CustomizeToolbar",
                    "chrome,all,dependent", navbox, bottomBox, leftBox, rightBox);
}


// override to make it look at all 4 toolboxes
function onViewToolbarsPopupShowing(aEvent) {
  var popup = aEvent.target;
  var i;

  // Empty the menu
  for(i = popup.childNodes.length-1; i >= 0; --i) {
    var deadItem = popup.childNodes[i];
    if(deadItem.hasAttribute("toolbarid"))
      popup.removeChild(deadItem);
  }
  
  var firstMenuItem = popup.firstChild;
  
  var toolboxIds = ["navigator-toolbox","toolbarext-left-toolbox","toolbarext-bottom-toolbox","toolbarext-right-toolbox"];
  
  for(var j = 0; j < toolboxIds.length; j++) {
    var toolbox = document.getElementById(toolboxIds[j]);

    for (i = 0; i < toolbox.childNodes.length; ++i) {
      var toolbar = toolbox.childNodes[i];
      var toolbarName = toolbar.getAttribute("toolbarname");

      var type = toolbar.getAttribute("type");
      if (toolbarName && type != "menubar") {
        var menuItem = document.createElement("menuitem");
        menuItem.setAttribute("toolbarid", toolbar.id);
        menuItem.setAttribute("type", "checkbox");
        menuItem.setAttribute("label", toolbarName);
        menuItem.setAttribute("accesskey", toolbar.getAttribute("accesskey"));
        menuItem.setAttribute("checked", toolbar.getAttribute("collapsed") != "true");
        popup.insertBefore(menuItem, firstMenuItem);        
        
        menuItem.addEventListener("command", onViewToolbarCommand, false);
      }
      toolbar = toolbar.nextSibling;
    }
  }
}

// rewritten to be based on toolbar ids rather than the toolbarindex
// (which was a stupid thing to use anyway :p )
function onViewToolbarCommand(aEvent) {
  var id = aEvent.originalTarget.getAttribute("toolbarid");
  var toolbar = document.getElementById(id);

  toolbar.collapsed = aEvent.originalTarget.getAttribute("checked") != "true";
  document.persist(toolbar.id, "collapsed");
}


// I don't fully understand what this function (from browser.js) was meant to do but
// it makes the extra toolboxes remain active rather than entering customisation mode.
// Replacing with this do-nothing version for the moment, and will fix it properly later.
function updateToolbarStates(toolbarMenuElt) {
  /*
  if (!gHaveUpdatedToolbarState) {
    var mainWindow = document.getElementById("main-window");
    if (mainWindow.hasAttribute("chromehidden")) {
      gHaveUpdatedToolbarState = true;
      var i;
      for (i = 0; i < toolbarMenuElt.childNodes.length; ++i)
        document.getElementById(toolbarMenuElt.childNodes[i].getAttribute("observes")).removeAttribute("checked");
      var toolbars = document.getElementsByTagName("toolbar");
      
      // Start i at 1, since we skip the menubar.
      for (i = 1; i < toolbars.length; ++i) {
        if (toolbars[i].getAttribute("class").indexOf("chromeclass") != -1)
          toolbars[i].setAttribute("hidden", "true");
      }
      var statusbars = document.getElementsByTagName("statusbar");
      for (i = 1; i < statusbars.length; ++i) {
        if (statusbars[i].getAttribute("class").indexOf("chromeclass") != -1)
          statusbars[i].setAttribute("hidden", "true");
      }
      mainWindow.removeAttribute("chromehidden");
    }
  }
  */
}
