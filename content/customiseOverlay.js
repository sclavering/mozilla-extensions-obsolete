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
    
    for (var i = 0; i < toolbox.childNodes.length; ++i) {
      var toolbar = toolbox.childNodes[i];
      if (isCustomizableToolbar(toolbar)) {
        for (var k = 0; k < toolbar.childNodes.length; ++k) {
          var item = toolbar.childNodes[k];
          if (isToolbarItem(item)) {
            var nextSibling = item.nextSibling;
            
            var wrapper = wrapToolbarItem(item);
            
            if (nextSibling)
              toolbar.insertBefore(wrapper, nextSibling);
            else
              toolbar.appendChild(wrapper);
          }
        }
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





// xxx: fix these
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


function updateToolbarMode(aModeValue) {
  setAttribute(gToolbox, "mode", aModeValue);
  gToolboxDocument.persist(gToolbox.id, "mode");

  for (var i = 0; i < gToolbox.childNodes.length; ++i) {
    var toolbar = getToolbarAt(i);
    if (isCustomizableToolbar(toolbar)) {
      setAttribute(toolbar, "mode", aModeValue);
      gToolboxDocument.persist(toolbar.id, "mode");
    }
  }

  var iconSizeCheckbox = document.getElementById("smallicons");
  if (aModeValue == "text") {
    iconSizeCheckbox.disabled = true;
    iconSizeCheckbox.checked = false;
    updateIconSize(false);
  }
  else {
    iconSizeCheckbox.disabled = false;
  }

  repositionDialog();
}