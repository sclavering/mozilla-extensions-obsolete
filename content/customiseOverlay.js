// mostly we're just redefining functions that already exist to cope with multiple toolboxes
// (i.e the function body gets wrapped in a for(){} loop, and references to |gToolbox| get changed)

var gToolboxes = null;

function onLoad() {
  gToolbox = window.arguments[0];
  gToolboxDocument = gToolbox.ownerDocument;

  // we pass the full array of toolboxes as the 2nd arg so as not to break
  // any other xul apps (extensions) which are using customisable toolbars
  gToolboxes = (window.arguments.length > 1) ? window.arguments[1] : [gToolbox];

  for(var i = 0; i < gToolboxes.length; i++) {
    gToolboxes[i].addEventListener("draggesture", onToolbarDragGesture, false);
    gToolboxes[i].addEventListener("dragover", onToolbarDragOver, false);
    gToolboxes[i].addEventListener("dragexit", onToolbarDragExit, false);
    gToolboxes[i].addEventListener("dragdrop", onToolbarDragDrop, false);
    // useful for min-width styles and suchlike
    gToolboxes[i].setAttribute("incustomisemode","true");
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
    gToolboxes[i].removeAttribute("incustomisemode");
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
        if(customIndex) {
          if(!toolbar.firstChild) {
            // Remove custom toolbars whose contents have been removed.
            toolbox.removeChild(toolbar);
            --i;
          } else if(toolbox.toolbarset.getAttribute('anonymous')=='true') {
            // for the toolbox below the tab bar.  in xbl, so attributes can't
            // be persisted.  so we store the info on the document root instead
            var docElt = gToolboxDocument.documentElement;
            var attrPrefix = '_toolbarset_' + toolbox.toolbarset.getAttribute('anonid') + '_toolbar';

            // Persist custom toolbar info on the <toolbarset/>
            docElt.setAttribute(attrPrefix+(++customCount), toolbar.toolbarName + ":" + currentSet);
            gToolboxDocument.persist(docElt.id, attrPrefix+customCount);
          } else {
            // Persist custom toolbar info on the <toolbarset/>
            toolbox.toolbarset.setAttribute("toolbar"+(++customCount),
                                             toolbar.toolbarName + ":" + currentSet);
            gToolboxDocument.persist(toolbox.toolbarset.id, "toolbar"+customCount);
          }

        } else if(toolbar.getAttribute('anonymous')=='true') {
          // for the tab-strip toolbars.  they're in XBL, so persistence doesn't work
          // instead we persist a custom attribute on the document.
          var attr = "_toolbar_currentset_"+toolbar.getAttribute('anonid');
          gToolboxDocument.documentElement.setAttribute(attr,currentSet);
          gToolboxDocument.persist(gToolboxDocument.documentElement.id,attr);

        } else {
          // Persist the currentset attribute directly on hardcoded toolbars.
          gToolboxDocument.persist(toolbar.id, "currentset");
        }
      }
    }

    // Remove toolbarX attributes for removed toolbars.
    // (we need the |if| because the toolboxes on the tabbar do not have a toolbarset)
    var toolbarset = toolbox.toolbarset;
    if(!toolbarset) continue;

    if(toolbarset.getAttribute('anonymous')=='true') {
      // for the toolbarbox below the tab bar
      var docElt = gToolboxDocument.documentElement;
      var attrPrefix = '_toolbarset_' + toolbarset.getAttribute('anonid') + '_toolbar';
      while(docElt.hasAttribute(attrPrefix+(++customCount))) {
        docElt.removeAttribute(attrPrefix+customCount);
        gToolboxDocument.persist(docElt.id, attrPrefix+customCount);
      }
    } else {
      while(toolbox.toolbarset.hasAttribute("toolbar"+(++customCount))) {
        toolbox.toolbarset.removeAttribute("toolbar"+customCount);
        gToolboxDocument.persist(toolbox.toolbarset.id, "toolbar"+customCount);
      }
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
               "dependent,modal,centerscreen", gToolboxes);
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

  gToolbox.appendCustomToolbar(name.value, "", true);

  repositionDialog();
  gToolboxChanged = true;
}


// called from the new dialog window
function doAddNewToolbar(toolboxIndex, name) {
  var toolbox = gToolboxes[toolboxIndex]
  toolbox.appendCustomToolbar(name, "", true);

  repositionDialog();
  gToolboxChanged = true;
}




/**
 * Restore the default set of buttons to fixed toolbars,
 * remove all custom toolbars, and rebuild the palette.
 */
function restoreDefaultSet() {
  for(var i = 0; i < gToolboxes.length; i++) {
    var toolbox = gToolboxes[i];

    // Restore the defaultset for fixed toolbars.
    var toolbar = toolbox.firstChild;
    while (toolbar) {
      if(isCustomizableToolbar(toolbar)) {
        if(!toolbar.hasAttribute("customindex")) {
          var defaultSet = toolbar.getAttribute("defaultset");
          if(defaultSet)
            toolbar.currentSet = defaultSet;
        }
      }
      toolbar = toolbar.nextSibling;
    }

    // Remove all of the customized toolbars.
    var child = toolbox.lastChild;
    while(child) {
      if(child.hasAttribute("customindex")) {
        var thisChild = child;
        child = child.previousSibling;
        toolbox.removeChild(thisChild);
      } else {
        child = child.previousSibling;
      }
    }
  }

  // Now rebuild the palette.
  buildPalette();

  // Now re-wrap the items on the toolbar.
  wrapToolbarItems();

  repositionDialog();
  gToolboxChanged = true;
}




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



// called as window closes.  inform toolboxes that customisation is complete.
// xxx: fire DOM events as well
function notifyParentComplete() {
  for(var i = 0; i < gToolboxes.length; i++) {
    if("customizeDone" in gToolboxes[i]) gToolboxes[i].customizeDone(gToolboxChanged);
  }
}
