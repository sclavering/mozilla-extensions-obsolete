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
 * The Original Code is mozilla.org code.
 *
 * The Initial Developer of the Original Code is 
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1998
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Blake Ross <blakeross@telocity.com>
 *   Peter Annema <disttsc@bart.nl>
 *   Dean Tessman <dean_tessman@hotmail.com>
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


/**
 * Use Stylesheet functions.
 *     Written by Tim Hill (bug 6782)
 *     Frameset handling by Neil Rashbrook <neil@parkwaycc.co.uk>
 **/
function getStyleSheetArray(frame) {
  var styleSheets = frame.document.styleSheets;
  var styleSheetsArray = new Array(styleSheets.length);
  for (var i = 0; i < styleSheets.length; i++) {
    styleSheetsArray[i] = styleSheets[i];
  }
  return styleSheetsArray;
}

function getAllStyleSheets(frameset) {
  var styleSheetsArray = getStyleSheetArray(frameset);
  for (var i = 0; i < frameset.frames.length; i++) {
    var frameSheets = getAllStyleSheets(frameset.frames[i]);
    styleSheetsArray = styleSheetsArray.concat(frameSheets);
  }
  return styleSheetsArray;
}

function styleswitcherBuildMenu(menuPopup) {
  // empty menu apart from No/Persistent Stylesheets option
  var itemNoStyles = menuPopup.childNodes[0];
  var itemPersistentStyles = menuPopup.childNodes[1];
  while (itemPersistentStyles.nextSibling)
    menuPopup.removeChild(itemPersistentStyles.nextSibling);
  
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
  itemPersistentStyles.setAttribute("style", hasPersistentStylesheet ? "" : "display:none");
}


function styleswitcherMenuClickHandler(evt, menu, page) {
  if(evt.target == menu.firstChild) stylesheetDisableAll(page);
  else stylesheetSwitchAll(page, evt.target.getAttribute("data"));
}


function stylesheetInFrame(frame, title) {
  var docStyleSheets = frame.document.styleSheets;
  for(var i = 0; i < docStyleSheets.length; ++i) {
    if(docStyleSheets[i].title == title)
      return true;
  }
  return false;
}
function stylesheetSwitchFrame(frame, title) {
  var docStyleSheets = frame.document.styleSheets;
  for (var i = 0; i < docStyleSheets.length; ++i) {
    var docStyleSheet = docStyleSheets[i];
    if(docStyleSheet.title)
      docStyleSheet.disabled = (docStyleSheet.title != title);
    else if(docStyleSheet.disabled)
      docStyleSheet.disabled = false;
  }
}
function stylesheetSwitchAll(frameset, title) {
  if (!title || stylesheetInFrame(frameset, title)) {
    stylesheetSwitchFrame(frameset, title);
  }
  for (var i = 0; i < frameset.frames.length; i++) {
    stylesheetSwitchAll(frameset.frames[i], title);
  }
}


// disable all stylesheets.  written by Stephen Clavering
function stylesheetDisableFrame(frame) {
  var docStyleSheets = frame.document.styleSheets;
  for(var i = 0; i < docStyleSheets.length; i++)
    docStyleSheets[i].disabled = true;
}
function stylesheetDisableAll(frameset) {
  stylesheetDisableFrame(frameset);
  for(var i = 0; i < frameset.frames.length; i++)
    stylesheetDisableAll(frameset.frames[i]);
}




/*
// add a standard stylesheet

function stylesheetSwitchAllToStandard(frame, menuitem) {
  var sheetURL = menuitem.getAttribute("data");
  var title = "BUILTIN-" + menuitem.label;
  var uri = "http://clav.port5.com/csstemp/" + menuitem.label.toLowerCase() + ".css"
  stylesheetAddToFrame(frame,title,uri);
  stylesheetSwitchAll(frame,title);
  //
  var doc = frame.document;
  for(var i = 0; i < doc.styleSheets.length; i++) alert(doc.styleSheets[i].title);
}


function stylesheetAddToFrame(frame, title, uri) {
  var doc = frame.document;
  if(!stylesheetInFrame(frame, title)) {
    var link = doc.createElement("link");
//    link.setAttribute("href","resource://stylesheets/oldstyle.css");
    link.setAttribute("href",uri);
    link.setAttribute("rel","alternate stylesheet");
    link.setAttribute("type","text/css");
    link.setAttribute("title",title);
    doc.getElementsByTagName("head")[0].appendChild(link);
  //  alert(sheets[1]);
  }
}*/



