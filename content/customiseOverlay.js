// mostly we're just redefining functions that already exist to cope with multiple toolboxes
// (i.e the function body gets wrapped in a for(){} loop, and references to |gToolbox| get changed)

var gToolboxes = null;

function onLoad() {
  gToolbox = window.arguments[0];
  gToolboxDocument = gToolbox.ownerDocument;

  gToolboxes = window.arguments;

  for(var i = 0; i < gToolboxes.length; i++) {
    gToolboxes[i].addEventListener("draggesture", onToolbarDragGesture, false);
    gToolboxes[i].addEventListener("dragover", onToolbarDragOver, false);
    gToolboxes[i].addEventListener("dragexit", onToolbarDragExit, false);
    gToolboxes[i].addEventListener("dragdrop", onToolbarDragDrop, false);
  }

  document.documentElement.setAttribute("hidechrome", "true");

  repositionDialog();
  window.outerWidth = kWindowWidth;
  window.outerHeight = 50;
  slideOpen(0);
}


function removeToolboxListeners() {
  for(var i = 0; i < gToolboxes.length; i++) {
    gToolboxes[i].removeEventListener("draggesture", onToolbarDragGesture, false);
    gToolboxes[i].removeEventListener("dragover", onToolbarDragOver, false);
    gToolboxes[i].removeEventListener("dragexit", onToolbarDragExit, false);
    gToolboxes[i].removeEventListener("dragdrop", onToolbarDragDrop, false);
  }
  
  // we're already overriding this function, and it gets called at the right time
  // so we'll tag this in here
  restoreContextMenus();
}


function restoreContextMenus() {
  for(var i = 0; i < gToolboxes.length; i++) {
    var toolbox = gToolboxes[i];
    
    toolbox.removeAttribute("context");
    
    var oldcontext = toolbox.getAttribute("oldcontext");
    if(oldcontext) {
      toolbox.setAttribute("context",oldcontext);
      toolbox.removeAttribute("oldcontext");
    }
    
    for(var j = 0; j < toolbox.childNodes.length; j++) {
      var toolbar = toolbox.childNodes[j];
      // must avoid messing with attrs on <toolbarset/>s
      if(toolbar.localName!="toolbar") continue;
      
      toolbar.removeAttribute("context");
      
      var oldcontext = toolbar.getAttribute("oldcontext");
      if(oldcontext) {
        toolbar.setAttribute("context",oldcontext);
        toolbar.removeAttribute("oldcontext");
      }
    }  
  }
}



// overriding so that we can tag changing of context menus on to the end
function initDialog() {
  document.getElementById("main-box").collapsed = false;
  
  var mode = gToolbox.getAttribute("mode");
  document.getElementById("modelist").value = mode;
  var iconSize = gToolbox.getAttribute("iconsize");
  var smallIconsCheckbox = document.getElementById("smallicons");
  if (mode == "text")
    smallIconsCheckbox.disabled = true;
  else
    smallIconsCheckbox.checked = iconSize == "small"; 

  // Build up the palette of other items.
  buildPalette();

  // Wrap all the items on the toolbar in toolbarpaletteitems.
  wrapToolbarItems();
  
  // extra 
  replaceContextMenus();
}

function replaceContextMenus() {
  for(var i = 0; i < gToolboxes.length; i++) {
    var toolbox = gToolboxes[i];
    
    // always disable standard context menu
    var context = toolbox.getAttribute("contextmenu");
    if(context) {
      toolbox.setAttribute("oldcontext", context);
      toolbox.removeAttribute("contextmenu");
    }
    var customiseContext = toolbox.getAttribute("customiseContext");
    if(customiseContext) toolbox.setAttribute("context",customiseContext);
    
    for(var j = 0; j < toolbox.childNodes.length; j++) {
      var toolbar = toolbox.childNodes[j];
      // must avoid messing with attrs on <toolbarset/>s
      if(toolbar.localName!="toolbar") continue;
      
      var tcontext = toolbar.getAttribute("context");
      if(tcontext) {
        toolbar.setAttribute("oldcontext",tcontext);
        toolbar.removeAttribute("context");
      }
      
      var tCustomiseContext = toolbar.getAttribute("customise-context");
      if(tCustomiseContext) {
        toolbar.setAttribute("context",tCustomiseContext);
      } else if(customiseContext) {
        toolbar.setAttribute("context",customiseContext);
      }
    }
  }
}








function persistCurrentSets() {
  // it would be nice to test for each individual toolbox, but that requires
  // replicating all the drag+drop code just to change one or two lines
  if(!gToolboxChanged) return;
  
  for(var j = 0; j < gToolboxes.length; j++) {
    
    var toolbox = gToolboxes[j];
    
    var customCount = 0;
    for(var i = 0; i < toolbox.childNodes.length; ++i) {
      // Look for customizable toolbars that need to be persisted.
      var toolbar = toolbox.childNodes[i];
      if(isCustomizableToolbar(toolbar)) {
        // Calculate currentset and store it in the attribute.
        var currentSet = toolbar.currentSet;
        toolbar.setAttribute("currentset", currentSet);
        
        var customIndex = toolbar.hasAttribute("customindex");
        if (customIndex) {
          if (!toolbar.firstChild) {
            // Remove custom toolbars whose contents have been removed.
            toolbox.removeChild(toolbar);
            --i;
          } else {
            // Persist custom toolbar info on the <toolbarset/>
            toolbox.toolbarset.setAttribute("toolbar"+(++customCount),
                                             toolbar.toolbarName + ":" + currentSet);
            gToolboxDocument.persist(toolbox.toolbarset.id, "toolbar"+customCount);
          }
        }
  
        if (!customIndex) {
          // Persist the currentset attribute directly on hardcoded toolbars.
          gToolboxDocument.persist(toolbar.id, "currentset");
        }
      }
    }
    
    // Remove toolbarX attributes for removed toolbars.
    while (toolbox.toolbarset.hasAttribute("toolbar"+(++customCount))) {
      toolbox.toolbarset.removeAttribute("toolbar"+customCount);
      gToolboxDocument.persist(toolbox.toolbarset.id, "toolbar"+customCount);
    }
  }
}



function wrapToolbarItems() {
  for(var j = 0; j < gToolboxes.length; j++) {
    var toolbox = gToolboxes[j];
    
    for(var i = 0; i < toolbox.childNodes.length; ++i) {
      var toolbar = toolbox.childNodes[i];
      if(!isCustomizableToolbar(toolbar)) continue;

      for(var k = 0; k < toolbar.childNodes.length; ++k) {
        var item = toolbar.childNodes[k];
      
        if(!isToolbarItem(item)) continue;
        
        var nextSibling = item.nextSibling;
        
        var wrapper = wrapToolbarItem(item);
        
        if(nextSibling)
          toolbar.insertBefore(wrapper, nextSibling);
        else
          toolbar.appendChild(wrapper);
      }
    }
  }
}



function unwrapToolbarItems() {
  for(var j = 0; j < this.gToolboxes.length; j++) {
    var toolbox = gToolboxes[j];
    
    var paletteItems = toolbox.getElementsByTagName("toolbarpaletteitem");
    var paletteItem;
    while ((paletteItem = paletteItems.item(0)) != null) {
      var toolbarItem = paletteItem.firstChild;
  
      if (paletteItem.hasAttribute("itemdisabled"))
        toolbarItem.disabled = true;
  
      if (paletteItem.hasAttribute("itemcommand"))
        toolbarItem.setAttribute("command", paletteItem.getAttribute("itemcommand"));
  
      // We need the removeChild here because replaceChild and XBL no workee
      // together.  See bug 193298.
      paletteItem.removeChild(toolbarItem);
      paletteItem.parentNode.replaceChild(toolbarItem, paletteItem);
    }
  }
}




/**
 * Get the list of ids for the current set of items on each toolbar. ***in each toolbox***
 */
function getCurrentItemIds()
{
  var currentItems = {};
  for(var j = 0; j < gToolboxes.length; j++) {
    var toolbox = gToolboxes[j];
    
    for (var i = 0; i < toolbox.childNodes.length; ++i) {
      var toolbar = toolbox.childNodes[i];
      if (isCustomizableToolbar(toolbar)) {
        var child = toolbar.firstChild;
        while (child) {
          if (isToolbarItem(child))
            currentItems[child.id] = 1;
          child = child.nextSibling;
        }
      }
    }
  }
  return currentItems;
}




function addNewToolbar() {
  // just in case someone happens to have another extension installed which uses it's own
  // customisable toolbars.  (or if Bookmarks Manager toolbars ever become customisable)
  if(gToolboxes.length > 1) {
    openDialog("chrome://toolbarext/content/newtoolbar.xul","add-new-toolbar",
               "dependent,modal", gToolboxes);
    return;
  }
  
  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                .getService(Components.interfaces.nsIPromptService);

  var stringBundle = document.getElementById("stringBundle");
  var message = stringBundle.getString("enterToolbarName");
  var title = stringBundle.getString("enterToolbarTitle");
  
  var name = {};
  while (1) {
    if (!promptService.prompt(window, title, message, name, null, {})) {
      return;
    } else {
      // Check for an existing toolbar with the same name and prompt again
      // if a conflict is found
      var nameToId = "__customToolbar_" + name.value.replace(" ", "");
      var existingToolbar = gToolboxDocument.getElementById(nameToId);
      if (existingToolbar) {
        message = stringBundle.getFormattedString("enterToolbarDup", [name.value]);
      } else {
        break;
      }
    }
  }
    
  gToolbox.appendCustomToolbar(name.value, "");

  repositionDialog();
  gToolboxChanged = true;
}


// called from the new dialog window
function doAddNewToolbar(toolboxIndex, name) {
  var toolbox = gToolboxes[toolboxIndex]
  toolbox.appendCustomToolbar(name, "");

  repositionDialog();
  gToolboxChanged = true;
}




/* restoreDefaultSet is being left for later */




/* we are deliberately not overriding updateIconSize and updateToolbarMode,
   because I like it this way :) * /
function updateIconSize(aUseSmallIcons) {
  var val = aUseSmallIcons ? "small" : null;
  
  for(var j = 0; j < gToolboxes.length; j++) {
    var toolbox = gToolboxes[j];
    
    // the default theme doens't use these, but other themes might be
    // (since they were in the original code)
    setAttribute(toolbox, "iconsize", val);
    gToolboxDocument.persist(toolbox.id, "iconsize");
    
    for(var i = 0; i < toolbox.childNodes.length; ++i) {
      var toolbar = toolbox.childNodes[i];
      if(isCustomizableToolbar(toolbar)) {
        setAttribute(toolbar, "iconsize", val);
        gToolboxDocument.persist(toolbar.id, "iconsize");
      }
    }
  }
  
  repositionDialog();
}


function updateToolbarMode(aModeValue) {
  
  for(var j = 0; j < gToolboxes.length; j++) {
    var toolbox = gToolboxes[j];
    
    setAttribute(toolbox, "mode", aModeValue);
    gToolboxDocument.persist(toolbox.id, "mode");
  
    for (var i = 0; i < toolbox.childNodes.length; ++i) {
      var toolbar = toolbox.childNodes[i];
      if (isCustomizableToolbar(toolbar)) {
        setAttribute(toolbar, "mode", aModeValue);
        gToolboxDocument.persist(toolbar.id, "mode");
      }
    }
  }

  var iconSizeCheckbox = document.getElementById("smallicons");
  if(aModeValue == "text") {
    iconSizeCheckbox.disabled = true;
    iconSizeCheckbox.checked = false;
    updateIconSize(false);
  } else {
    iconSizeCheckbox.disabled = false;
  }

  repositionDialog();
}
*/