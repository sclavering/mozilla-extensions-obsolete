// these functions are all for middle-click events only
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


// onshowing + oncommand handlers for the context menu for toolbars while customising

function toolbarextInitCustomiseContext(evt, popup) {
  var toolbar = document.popupNode;
  while(toolbar.localName!="toolbar") toolbar = toolbar.parentNode;
  
  var mode = toolbar.getAttribute("mode");
  
  var radio = popup.firstChild;
  for(var radio = popup.firstChild; radio && radio.localName=="menuitem"; radio = radio.nextSibling) {
    if(radio.value==mode) radio.setAttribute("checked","true");
    // radio menuitems do not sort this out themselves it seems :(
    else radio.removeAttribute("checked");
  }
  
  var iconSize = toolbar.getAttribute("iconsize");
  var smallicons = popup.lastChild;
  if(mode=="text") smallicons.setAttribute("disabled",true);
  else smallicons.removeAttribute("disabled");
  smallicons.setAttribute("checked", iconSize == "small"); 
}

function toolbarextSetToolbarMode(evt) {
  var mode = evt.originalTarget.value;
  if(!mode) return; // ignore small-icons checkbox
  
  var toolbar = document.popupNode;
  while(toolbar.localName!="toolbar") toolbar = toolbar.parentNode;

  toolbar.setAttribute("mode", mode);
  document.persist(toolbar.id, "mode");
}
function toolbarextToggleSmallIcons(evt) {
  var toolbar = document.popupNode;
  while(toolbar.localName!="toolbar") toolbar = toolbar.parentNode;

  // xxx: not taking effect until customisation finishes!
  var small = (evt.originalTarget.getAttribute("checked")=="true");
  if(small) toolbar.setAttribute("iconsize","small");
  else toolbar.removeAttribute("iconsize");
  document.persist(toolbar.id, "iconsize");
} 
  


/*

function updateIconSize(aUseSmallIcons)
{
  var val = aUseSmallIcons ? "small" : null;
  
  setAttribute(gToolbox, "iconsize", val);
  gToolboxDocument.persist(gToolbox.id, "iconsize");
  
  for (var i = 0; i < gToolbox.childNodes.length; ++i) {
    var toolbar = getToolbarAt(i);
    if (isCustomizableToolbar(toolbar)) {
      setAttribute(toolbar, "iconsize", val);
      gToolboxDocument.persist(toolbar.id, "iconsize");
    }
  }

  repositionDialog();
}

*/