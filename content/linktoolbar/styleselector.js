/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: NPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Netscape Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/NPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Alternate Stylesheet selection code from Mozilla 1.1
 *
 * The Initial Developer of the Original Code is Tim Hill (bug 6782)
 *
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Original Use Stylesheet functions by Tim Hill (bug 6782)
 *   Frameset Handling by  Neil Rashbrook <neil@parkwaycc.co.uk>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the NPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the NPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// extracted from /chrome/comm/navigator/browser.js in Mozilla 1.1

/* -- scragz
var ShowTheColor = false;
var LinkTagArray = document.commandDispatcher.focusedWindow.document.getElementsByTagName("link");
if (LinkTagArray.length > 0) {
   for (var i=0; i < LinkTagArray.length; i++) {
      if (LinkTagArray[i].getAttribute("rel").toLowerCase() == "alternate stylesheet" &&
         LinkTagArray[i].getAttribute("media").toLowerCase() != "print") {
         ShowTheColor = true;
      }
   }
}

'alternative stylesheet' / 'alt stylesheet' ?

*/
var StyleSelector = {
  contentArea: null,
  button: null, // styleswitcher toolbarbutton

  init: function() {
    // isn't JS scoping stupid?
    window.removeEventListener("load",this,true);
    StyleSelector.contentArea = document.getElementById("appcontent");
    //StyleSelector.button = document.getElementById("styleselector");
    StyleSelector.contentArea.addEventListener("select", function(e){StyleSelector.updateUI(e);},false);
    StyleSelector.contentArea.addEventListener("load", function(e){StyleSelector.updateUI(e);},true);
  },

  // grey the button if there aren't any alt stylesheets
  updateUI: function(e) {
    var doc = getBrowser().contentDocument.documentElement;
    if(!(doc instanceof Components.interfaces.nsIDOMHTMLHtmlElement)) return;
    var styleSheets = getAllStyleSheets(window._content)
    //if(styleSheets.length>1) StyleSelector.button.setAttribute("hasstyles","true");
    //else StyleSelector.button.removeAttribute("hasstyles");
    var btn = document.getElementById("styleselector");
    
    if(styleSheets.length>1) btn.setAttribute("hasstyles","true");
    else btn.removeAttribute("hasstyles");

    /*
      var LinkTagArray = document.commandDispatcher.focusedWindow.document.getElementsByTagName("link");
      if (LinkTagArray.length > 0) {
        for (var i=0; i < LinkTagArray.length; i++) {
          if ((LinkTagArray[i].getAttribute("rel").toLowerCase() == "alternative stylesheet" ||
               LinkTagArray[i].getAttribute("rel").toLowerCase() == "alternate stylesheet" ||
               LinkTagArray[i].getAttribute("rel").toLowerCase() == "alt stylesheet") &&
            LinkTagArray[i].getAttribute("media").toLowerCase() != "print") {
             btn.setAttribute("hasstyles","true");
          }
        }
      }
    */
  },

  commanded: function(evt, menu, page) {
    if(evt.target == menu.firstChild) disableAllStyles(page);
    else useStylesheet(page, evt.target.getAttribute("data"));
  },

  emptyMenu: function(menuPopup) {
    // empty menu apart from No/Persistent Stylesheets option
    var itemNoStyles = menuPopup.childNodes[0];
    var itemPersistentStyles = menuPopup.childNodes[1];
    while (itemPersistentStyles.nextSibling)
      menuPopup.removeChild(itemPersistentStyles.nextSibling);
  },

  buildMenu: function styleselectorBuildMenu(menuPopup) {
    var itemNoStyles = menuPopup.childNodes[0];
    var itemPersistentStyles = menuPopup.childNodes[1];

    var styleSheets = getAllStyleSheets(window._content);
    var menuItems = [];
    var anyStyleEnabled = false;
    var optionalStyleEnabled = false;
    var hasPersistentStylesheet = false;

    for(var i = 0; i < styleSheets.length; i++) {
      var currentStyleSheet = styleSheets[i];

      if(!currentStyleSheet.disabled) {
        anyStyleEnabled = true;
        if(currentStyleSheet.title) optionalStyleEnabled = true;
      }

      if(!currentStyleSheet.title) {
        hasPersistentStylesheet = true;
      } else {
        var title = currentStyleSheet.title;
        var lastWithSameTitle = null;
        if(title in menuItems)
          lastWithSameTitle = menuItems[title];

        if(!lastWithSameTitle) {
          var menuItem = document.createElement("menuitem");
          menuItem.setAttribute("type", "radio");
          menuItem.setAttribute("label", title);
          menuItem.setAttribute("data", title);
          menuItem.setAttribute("checked", !currentStyleSheet.disabled);
          menuPopup.appendChild(menuItem);
          menuItems[title] = menuItem;
        } else {
          if(currentStyleSheet.disabled)
            lastWithSameTitle.removeAttribute("checked");
        }
      }
    }
    itemNoStyles.setAttribute("checked", anyStyleEnabled ? "false" : "true");
    itemPersistentStyles.setAttribute("checked", (anyStyleEnabled && !optionalStyleEnabled) ? "true" : "false");
    if(hasPersistentStylesheet) itemPersistentStyles.removeAttribute("style");
    else itemPersistentStyles.setAttribute("style","display:none");
  }
}


// building the main styleselector popup
function getFrameStyleSheet(frame) {
  var styleSheets = frame.document.styleSheets;
  var styleSheetsArray = new Array(styleSheets.length);
  for (var i = 0; i < styleSheets.length; i++) {
    styleSheetsArray[i] = styleSheets[i];
  }
  return styleSheetsArray;
}
function getAllStyleSheets(frameset) {
  var styleSheetsArray = getFrameStyleSheet(frameset);
  for (var i = 0; i < frameset.frames.length; i++) {
    var frameSheets = getAllStyleSheets(frameset.frames[i]);
    styleSheetsArray = styleSheetsArray.concat(frameSheets);
  }
  return styleSheetsArray;
}


// test if a stylesheet is in a page
function isStylesheetInFrame(frame, title) {
  var sheets = frame.document.styleSheets;
  for(var i = 0; i < sheets.length; i++)
    if(sheets[i].title == title)
      return true;
  return false;
}


// disable all page stylesheets.  written by Stephen Clavering
function disableAllStyles(frameset) {
  disableAllStylesInFrame(frameset);
  for(var i = 0; i < frameset.frames.length; i++)
    disableAllStyles(frameset.frames[i]);
}
function disableAllStylesInFrame(frame) {
  var sheets = frame.document.styleSheets;
  for(var i = 0; i < sheets.length; i++)
    if(!sheets[i].isUserStylesheet)
      sheets[i].disabled = true;
}


// enable one of the stylesheets for the page
function useStylesheet(frameset, title) {
  if (!title || isStylesheetInFrame(frameset, title))
    useStylesheetInFrame(frameset, title);
  for (var i = 0; i < frameset.frames.length; i++)
    useStylesheet(frameset.frames[i], title);
}
function useStylesheetInFrame(frame, title) {
  var sheets = frame.document.styleSheets;
  for(var i = 0; i < sheets.length; i++) {
    var sheet = sheets[i];
    sheet.disabled = (sheet.title) ? (sheet.title != title) : false;
  }
}


window.addEventListener("load",StyleSelector.init(),true);
