var gTbxToolboxes = null;
var gTbxNavToolbox = null;

function tbxGetToolboxes() {
  gTbxToolboxes = [];

  // normal toolbox
  gTbxNavToolbox = document.getElementById("navigator-toolbox");
  gTbxToolboxes.push(gTbxNavToolbox);

  // toolboxes on each other side of browser
  gTbxToolboxes.push(document.getElementById("tbx-bottom-toolbox"));
  gTbxToolboxes.push(document.getElementById("tbx-left-toolbox"));
  gTbxToolboxes.push(document.getElementById("tbx-right-toolbox"));

  // toolboxes containing the singleton toolbars at each end of the status bar
  gTbxToolboxes.push(document.getElementById("tbx-toolbox-statusbar-left"));
  gTbxToolboxes.push(document.getElementById("tbx-toolbox-statusbar-right"));

  // get the toolboxes at each end of the tab strip. (they're anonymous, but getEltById still works)
  gTbxToolboxes.push(document.getElementById("tbx-tableft-toolbox"));
  gTbxToolboxes.push(document.getElementById("tbx-tabright-toolbox"));

  // get the toolbox below the tab bar
  gTbxToolboxes.push(document.getElementById("tbx-belowtabs-toolbox"));

  // might as well hook this up here
  document.getElementById("tbx-bottom-toolbox").customizeDone = tbxCustomiseDone;
}



// replacement start-customisation function that passes all our toolboxes as args to the window

function tbxBrowserCustomizeToolbar() {
  // Disable the toolbar context menu items
  var menubar = document.getElementById("main-menubar");
  for(var i = 0; i < menubar.childNodes.length; ++i)
    menubar.childNodes[i].setAttribute("disabled", true);

  // in practice this is irrelevant, because we replace the context menus anyway.
  document.getElementById("cmd_CustomizeToolbars").setAttribute("disabled", "true");

  if(!gTbxToolboxes) tbxGetToolboxes();

  openDialog("chrome://global/content/customizeToolbar.xul", "CustomizeToolbar",
             "chrome,all,dependent", gTbxNavToolbox, gTbxToolboxes);
}


function tbxCustomiseDone(anyToolboxChanged) {
  if(anyToolboxChanged) tbxInit();
}

function tbxInit() {
  // update the Stop/Reload combi-button
  tbxWebProgressListener.init();

  // update the js, image, and plugin per-tab pref toggles.
  tbxTabPrefToggles.init();

  // if our fullscreen toggle is present, and on a fullscreen toolbar, then remove the built-in
  // window controls. (using a custom attr, to avoid breaking the normal hiding-when-not-fullscreen)
  var fullscreen = document.getElementById('tbx-fullscreen-button');
  var controls = document.getElementById('window-controls');
  var hideControls = fullscreen && fullscreen.parentNode.getAttribute('fullscreentoolbar')=='true';
  if(hideControls) controls.setAttribute('hidecontrols','true');
  else controls.removeAttribute('hidecontrols');
}

window.addEventListener("load", tbxInit, false);




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

  var toolboxIds = ["navigator-toolbox","tbx-left-toolbox","tbx-bottom-toolbox","tbx-right-toolbox"];

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

  var hide = aEvent.originalTarget.getAttribute("checked") != "true";
  toolbar.parentNode.hideToolbar(toolbar,hide);
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

function tbxInitCustomiseContext(evt, popup) {
  var toolbar = document.popupNode;
  while(toolbar.localName!="toolbar") toolbar = toolbar.parentNode;

  var mode = toolbar.getAttribute("mode");

  for(var radio = popup.firstChild; radio && radio.localName=="menuitem"; radio = radio.nextSibling) {
    if(radio.value==mode) radio.setAttribute("checked","true");
    // radio menuitems do not sort this out themselves it seems :(
    else radio.removeAttribute("checked");
  }

  var small = toolbar.getAttribute("iconsize")=="small";
  var smallicons = popup.childNodes[4];
  if(mode=="text") smallicons.setAttribute("disabled",true);
  else smallicons.removeAttribute("disabled");
  smallicons.setAttribute("checked", small);

  var showInFullScreen = toolbar.getAttribute("fullscreentoolbar")=="true";
  popup.lastChild.setAttribute("checked", showInFullScreen);

  // We mustn't allow the default toolbars (Menubar, Navigation, Bookmarks) to be moved, because
  // it breaks things.  They can be identified because they have a defaultset attribute
  // Also we don't want the toolbars in the status bar and tab bar to be moved, and it just so
  // happends that they're toolboxes will have toolbarset==null.
  var toolbox = toolbar.parentNode;
  if(toolbar.getAttribute("defaultset") || !toolbox.toolbarset) {
    // hide the menuitems
    for(radio = popup.lastChild; radio.localName=="menuitem"; radio = radio.previousSibling)
      radio.hidden = true;
    // hide the menuseparator
    radio.hidden = true;
  } else {
    // show the menuitems, and check the appropriate one
    for(radio = popup.lastChild; radio.localName=="menuitem"; radio = radio.previousSibling) {
      radio.hidden = false;
      if(toolbox.id==radio.value) radio.setAttribute("checked","true");
      else radio.removeAttribute("checked");
    }
    // show the menuseparator
    radio.hidden = false;
  }
}

function tbxAdjustToolbar(evt) {
  var toolbar = document.popupNode;
  while(toolbar.localName!="toolbar") toolbar = toolbar.parentNode;

  var value = evt.originalTarget.value;
  var group = evt.originalTarget.getAttribute("name"); // radio group
  if(value=="smallicons") {
    var small = evt.originalTarget.getAttribute("checked")=="true";
    var size = small ? "small" : "large";
    toolbar.parentNode.setToolbarIconSize(toolbar, size);
  } else if(value=="fullscreen") {
    var showInFullScreen = evt.originalTarget.getAttribute("checked")=="true";
    toolbar.parentNode.showToolbarInFullscreen(toolbar,showInFullScreen);
  } else if(group=="mode") {
    toolbar.parentNode.setToolbarMode(toolbar, value);
  } else if(group=="position") {
    // We could just remove the <toolbar/> from its current location and append to the
    // desired toolbox, but that would mean we wouldn't respect the rule that custom
    // toolbars appear wherever the <toolbarset/> is.  Also it caused an interesting
    // bug where all the items on the toolbar would be duplicated sometimes after the
    // toolbar was moved.  Finally, we can't just get the currentSet of the existing
    // toolbar and pass it to appendCustomToolbar because currentSet always returns
    // "__empty" during customisation, because all the items are wrapped in extra elements.
    var items = [];
    while(toolbar.hasChildNodes()) items.push(toolbar.removeChild(toolbar.lastChild));
    toolbar.parentNode.removeChild(toolbar);

    var newToolbox = document.getElementById(value);
    var newToolbar = newToolbox.appendCustomToolbar(toolbar.toolbarName, "__empty", true);
    while(items.length) newToolbar.appendChild(items.pop());
  }
}
