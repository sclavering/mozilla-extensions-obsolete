/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Link Toolbar from Mozilla Seamonkey.
 *
 * The Initial Developer of the Original Code is Eric Hodel <drbrain@segment7.net>
 *
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Christopher Hoess <choess@force.stwing.upenn.edu>
 *      Tim Taylor <tim@tool-man.org>
 *      Stuart Ballard <sballard@netreach.net>
 *      Chris Neale <cdn@mozdev.org> [Port to Px and other trivialities]
 *      Stephen Clavering <mozilla@clav.me.uk>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/*
 * LinkToolbarItem and its subclasses represent the buttons, menuitems,
 * and menus that handle the various link types.
 *
 * |element| is the XUL menu/menuitem/toolbarbutton that will be used to
 * show the |linkType| in question
 */
function LinkToolbarItem (linkType, element) {
  this.linkType = linkType;
  this.xulElement = element; // || document.getElementById("link-"+linkType);
  // will be null for a LinkToolbarItem, but both LTMenu and LTButton use this
  this.xulPopup = document.getElementById("link-"+linkType+"-popup");
  this.parentMenuButton = null;

  this.clear = function() {
    this.disableParentMenuButton();
    this.xulElement.disabled = true;
    this.xulElement.hidden = true;
    this.xulElement.removeAttribute("href");
    this.xulElement.removeAttribute("tooltiptext1");
    this.xulElement.removeAttribute("tooltiptext2");
  }

  this.displayLink = function(linkElement) {
    if (this.xulElement.hasAttribute("href")) return false;
    this.setItem(linkElement);
    this.enableParentMenuButton();
    return true;
  }

  this.setItem = function(linkElement) {
    this.xulElement.setAttribute("href", linkElement.href);
    this.xulElement.disabled = false;
    this.xulElement.hidden = false;
    // lines will be hidden if blank
    this.xulElement.setAttribute("tooltiptext1", linkElement.longTitle);
    this.xulElement.setAttribute("tooltiptext2", linkElement.href);
  }

  this.enableParentMenuButton = function() {
    if(this.getParentMenuButton()) {
      this.getParentMenuButton().disabled = false;
      this.getParentMenuButton().hidden = false;
    }
  }

  this.disableParentMenuButton = function() {
    if(!this.parentMenuButton) return;
    this.parentMenuButton.disabled = true;
    this.parentMenuButton = null;
  }

  this.getParentMenuButton = function() {
    if(!this.parentMenuButton) {
      var node = this.xulElement;
      while(node.tagName!="toolbarbutton") node = node.parentNode;
      this.parentMenuButton = node;
    }
    return this.parentMenuButton;
  }
}


// new version, which morphs to type="menu" if
// there are multiple links for the linkType
function LinkToolbarButton (linkType, element) {
  this.constructor(linkType, element);

  this.haveLink = false;  // indicates the button is showing 1 or more links
  this.haveLinks = false; // indicates the button is showing 2 or more links

  this.clear = function() {
    this.haveLink = false;
    this.haveLinks = false;
    this.xulElement.disabled = true;
    this.xulElement.removeAttribute("href");
    this.xulElement.removeAttribute("tooltiptext1");
    this.xulElement.removeAttribute("tooltiptext2");
    // clear type="menu"
    this.xulElement.removeAttribute("type");
    while(this.xulPopup.hasChildNodes())
      this.xulPopup.removeChild(this.xulPopup.lastChild);
  }

  this.displayLink = function(linkElement) {
    // handle the first link
    if(!this.haveLink) {
      this.haveLink = true;
      this.setItem(linkElement);
    } else if(!this.haveLinks) {
      // we are now handling a second link, so morph to type=menu
      this.haveLinks = true;
      this.xulElement.setAttribute("type","menu");
      // must clear href or menu never shows
      this.xulElement.removeAttribute("href");
      this.xulElement.removeAttribute("tooltiptext1");
      this.xulElement.removeAttribute("tooltiptext2");
    }
    // add the link to the xul popup
    this.addMenuItem(linkElement);
  }

  this.addMenuItem = function(linkElement) {
    var menuitem = document.createElement("menuitem");
    // XXX: use longTitle for tooltip too ?
    menuitem.setAttribute("tooltiptext1", linkElement.title);
    menuitem.setAttribute("tooltiptext2", linkElement.href);
    menuitem.setAttribute("label", linkElement.longTitle);
    menuitem.setAttribute("href", linkElement.href);
    menuitem.className = "menuitem-iconic bookmark-item";
    this.xulPopup.appendChild(menuitem);
  }

  // do nothing.  unneeded?
  this.enableParentMenuButton = function() {};
  this.disableParentMenuButton = function() {};
}
LinkToolbarButton.prototype = new LinkToolbarItem;


function LinkToolbarMenu (linkType, element) {
  this.constructor(linkType, element);

  this.clear = function() {
    this.disableParentMenuButton();
    this.xulElement.disabled = true;
    this.xulElement.hidden = true;
    while(this.xulPopup.hasChildNodes())
      this.xulPopup.removeChild(this.xulPopup.lastChild);
  }

  this.displayLink = function(linkElement) {
    this.addMenuItem(linkElement);
    this.xulElement.disabled = false;
    this.xulElement.hidden = false;
    this.enableParentMenuButton();
    return true;
  }

  this.addMenuItem = function(linkElement) {
    var menuitem = document.createElement("menuitem");
    menuitem.setAttribute("tooltiptext1", linkElement.title);
    menuitem.setAttribute("tooltiptext2", linkElement.href);
    menuitem.setAttribute("label", linkElement.longTitle);
    menuitem.setAttribute("href", linkElement.href);
    menuitem.className = "menuitem-iconic bookmark-item";
    this.xulPopup.appendChild(menuitem);
  }
}
LinkToolbarMenu.prototype = new LinkToolbarItem;



// switches automatically between being a
// single menu item and a whole sub menu
function LinkToolbarTransientItem(linkType) {
  // create a menuitem
  var item = document.createElement("menuitem");
  item.id = "link-"+linkType+"-item";
  item.className = "menuitem-iconic bookmark-item";
  item.setAttribute("label",linkType);
  // and a menu
  var menu = document.createElement("menu");
  menu.id = "link-"+linkType+"-menu";
  menu.setAttribute("label",linkType);
  menu.hidden = true;
  menu.className = "menu-iconic bookmark-item";
  menu.setAttribute("container", "true");
  // create the popup to go with it
  var popup = document.createElement("menupopup");
  popup.id = "link-"+linkType+"-popup";
  menu.appendChild(popup);
  // add items and create object to control them
  var moreMenu = document.getElementById("more-menu-popup");
  moreMenu.appendChild(item);
  moreMenu.appendChild(menu);

  this.linkType = linkType;
  this.parentMenuButton = null;

  this.item = item;
  this.menu = menu;
  this.popup = popup;

  this.haveLink = false;  // indicates the button is showing 1 or more links
  this.haveLinks = false; // indicates the button is showing 2 or more links

  this.clear = function() {
    this.haveLink = false;
    this.haveLinks = false;
    this.item.hidden = true;
    this.menu.hidden = true;
    while(this.popup.hasChildNodes())
      this.popup.removeChild(this.popup.lastChild);
    this.disableParentMenuButton();
  }

  this.displayLink = function(linkInfo) {
    // handle the first link
    if(!this.haveLink) {
      this.haveLink = true;
      this.item.setAttribute("href", linkInfo.href);
      this.item.hidden = false;
      this.item.setAttribute("tooltiptext1", linkInfo.longTitle);
      this.item.setAttribute("tooltiptext2", linkInfo.href);
      this.enableParentMenuButton();
    } else if(!this.haveLinks) {
      // handling a second link, so hide item and show menu
      this.haveLinks = true;
      this.item.hidden = true;
      this.menu.hidden = false;
    }
    // add the link to the xul popup
    this.addMenuItem(linkInfo);
  }

  this.addMenuItem = function(linkInfo) {
    var menuitem = document.createElement("menuitem");
    // XXX: use longTitle for tooltip too ?
    menuitem.setAttribute("tooltiptext1", linkInfo.title);
    menuitem.setAttribute("tooltiptext2", linkInfo.href);
    menuitem.setAttribute("label", linkInfo.longTitle || linkInfo.href);
    menuitem.setAttribute("href", linkInfo.href);
    menuitem.className = "menuitem-iconic bookmark-item";
    this.popup.appendChild(menuitem);
  }

  // duplicated from ltItem.  will fix things to use inheritance later

  this.enableParentMenuButton = function() {
    if(this.getParentMenuButton()) {
      this.getParentMenuButton().disabled = false;
//      this.getParentMenuButton().hidden = false;
    }
  }

  this.disableParentMenuButton = function() {
    if(!this.parentMenuButton) return;
    this.parentMenuButton.disabled = true;
    // xxx: why?
    this.parentMenuButton = null;
  }

  this.getParentMenuButton = function() {
    if(!this.parentMenuButton) {
      var node = this.item;
      while(node.tagName!="toolbarbutton") node = node.parentNode;
      this.parentMenuButton = node;
    }
    return this.parentMenuButton;
  }
}
// member names are different, so functions duplicated rather than inherited
//LinkToolbarTransientItem.prototype = new LinkToolbarItem;
