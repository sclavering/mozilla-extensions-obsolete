// javascript for enhancing toolbar customisation.

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

  // get the toolboxes at the left and right of the tab strip. this really
  // does have to be this complex, because they're two xbl bindings down!
  var tabbrowser = document.getElementById("content");
  // there's nothing better to hook onto than the class attr :(
  var tabstrip = document.getAnonymousElementByAttribute(tabbrowser, 'class', 'tabbrowser-strip chromeclass-toolbar');
  gTbxToolboxes.push(document.getAnonymousElementByAttribute(tabstrip, 'anonid', 'tbx-toolbox-tableft'));
  gTbxToolboxes.push(document.getAnonymousElementByAttribute(tabstrip, 'anonid', 'tbx-toolbox-tabright'));

  // get the toolbox below the tab bar
  var tabbox = document.getAnonymousNodes(tabbrowser)[1];
  gTbxToolboxes.push(document.getAnonymousElementByAttribute(tabbox, 'anonid', 'tbx-toolbox-belowtabs'));


  // might as well hook this up here
  document.getElementById("tbx-bottom-toolbox").customizeDone = tbxCustomiseDone;
}



// replacement start-customisation function that passes all our toolboxes as args to the window

function ToolbarExt_BrowserCustomizeToolbar() {
  // Disable the toolbar context menu items
  var menubar = document.getElementById("main-menubar");
  for (var i = 0; i < menubar.childNodes.length; ++i)
    menubar.childNodes[i].setAttribute("disabled", true);

  // in practice this is irrelevant, because we replace the context menus anyway.
  var cmd = document.getElementById("cmd_CustomizeToolbars");
  cmd.setAttribute("disabled", "true");

  if(!gTbxToolboxes) tbxGetToolboxes();

  window.openDialog("chrome://global/content/customizeToolbar.xul", "CustomizeToolbar",
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
  var fullscreen = document.getElementById('tbx-fullscreen');
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

  var radio = popup.firstChild;
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
}

function tbxSetToolbarMode(evt) {
  var toolbar = document.popupNode;
  while(toolbar.localName!="toolbar") toolbar = toolbar.parentNode;

  var value = evt.originalTarget.value;
  if(value=="smallicons") {
    var small = evt.originalTarget.getAttribute("checked")=="true";
    var size = small ? "small" : "large";
    toolbar.parentNode.setToolbarIconSize(toolbar, size);
  } else if(value=="fullscreen") {
    var showInFullScreen = evt.originalTarget.getAttribute("checked")=="true";
    toolbar.parentNode.showToolbarInFullscreen(toolbar,showInFullScreen);
  } else {
    toolbar.parentNode.setToolbarMode(toolbar, value);
  }
}
