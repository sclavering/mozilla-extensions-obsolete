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
 * The Original Code is Eric Hodel's <drbrain@segment7.net> code.
 *
 * The Initial Developer of the Original Code is Eric Hodel.
 *
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Christopher Hoess <choess@force.stwing.upenn.edu>
 *      Tim Taylor <tim@tool-man.org>
 *      Stuart Ballard <sballard@netreach.net>
 *      Chris Neale <cdn@mozdev.org> [Port to Px and other trivialities]
 *      Stephen Clavering <mozilla@clav.co.uk>
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
 */
function LinkToolbarItem (linkType) {
  this.linkType = linkType;
  this.xulElementId = "link-" + linkType;
  this.xulPopupId = this.xulElementId + "-popup";
  this.parentMenuButton = null;

  // would like to just set this straight off, but I think this object might
  // be being created before the element has been added to the document
  this.xulElement = null;

  this.getXULElement = function() {
    if(!this.xulElement)
      this.xulElement = document.getElementById(this.xulElementId);
    return this.xulElement;
  }

  this.clear = function() {
    this.disableParentMenuButton();
    this.getXULElement().setAttribute("disabled", "true");
    this.getXULElement().setAttribute("hidden", "true");
    this.getXULElement().removeAttribute("href");
    this.getXULElement().removeAttribute("tooltiptext1");
    this.getXULElement().removeAttribute("tooltiptext2");
  }

  this.displayLink = function(linkElement) {
    if (this.getXULElement().hasAttribute("href")) return false;
    this.setItem(linkElement);
    this.enableParentMenuButton();
    return true;
  }

  this.setItem = function(linkElement) {
    this.getXULElement().setAttribute("href", linkElement.href);
    this.getXULElement().removeAttribute("disabled");
    this.getXULElement().removeAttribute("hidden");
    // lines will be hidden if blank
    this.getXULElement().setAttribute("tooltiptext1", linkElement.getLongTitle());
    this.getXULElement().setAttribute("tooltiptext2", linkElement.href);
  }

  this.enableParentMenuButton = function() {
    if(this.getParentMenuButton()) {
      this.getParentMenuButton().removeAttribute("disabled");
      this.getParentMenuButton().removeAttribute("hidden");
    }
  }

  this.disableParentMenuButton = function() {
    if (!this.parentMenuButton) return;
    this.parentMenuButton.setAttribute("disabled", "true");
    if (this.parentMenuButton.id != 'document-menu' &&
        this.parentMenuButton.id != 'more-menu')
      this.parentMenuButton.setAttribute("hidden", "true");
    this.parentMenuButton = null;
  }

  this.getParentMenuButton = function() {
    if(!this.parentMenuButton) {
      var node = this.getXULElement();
      while(node.tagName!="toolbarbutton") node = node.parentNode;
      this.parentMenuButton = node;
    }
    return this.parentMenuButton;
  }
}


function LinkToolbarButton (linkType) {
  this.constructor(linkType);

  // override because we want buttons disabled, not hidden
  this.clear = function() {
    this.getXULElement().setAttribute("disabled", "true");
    this.getXULElement().removeAttribute("href");
    this.getXULElement().removeAttribute("tooltiptext1");
    this.getXULElement().removeAttribute("tooltiptext2");
  }

  // do nothing.  unneeded?
  this.enableParentMenuButton = function() {};
  this.disableParentMenuButton = function() {};
}
LinkToolbarButton.prototype = new LinkToolbarItem;


function LinkToolbarMenu (linkType) {
  this.constructor(linkType);
  this.xulPopup = null;

  this.clear = function() {
    this.disableParentMenuButton();
    this.getXULElement().setAttribute("disabled", "true");
    this.getXULElement().setAttribute("hidden", "true");
    var popup = this.getPopup();
    while (popup.hasChildNodes())
      popup.removeChild(popup.lastChild);
  }

  this.getPopup = function() {
    if(!this.xulPopup) this.xulPopup = document.getElementById(this.xulPopupId);
    return this.xulPopup;
  }

  this.displayLink = function(linkElement) {
    this.addMenuItem(linkElement);
    this.getXULElement().removeAttribute("disabled");
    this.getXULElement().removeAttribute("hidden");
    this.enableParentMenuButton();
    return true;
  }

  function match(first, second) {
    if (!first && !second) return true;
    if (!first || !second) return false;
    return first == second;
  }

  this.addMenuItem = function(linkElement) {
    this.getPopup().appendChild(this.createMenuItem(linkElement));
  }

  this.createMenuItem = function(linkElement) {
    // XXX: clone a prototypical XUL element instead of hardcoding these
    //   attributes
    var menuitem = document.createElement("menuitem");

    menuitem.setAttribute("tooltiptext1", linkElement.title);
    menuitem.setAttribute("tooltiptext2", linkElement.href);

    menuitem.setAttribute("label", linkElement.getLabel());
    menuitem.setAttribute("href", linkElement.href);
    menuitem.setAttribute("class", "menuitem-iconic bookmark-item");

    return menuitem;
  }
}
LinkToolbarMenu.prototype = new LinkToolbarItem;


function LinkToolbarTransientMenu (linkType) {
  this.constructor(linkType);

  this.getXULElement = function() {
    if (this.__proto__.getXULElement.apply(this))
      return this.__proto__.getXULElement.apply(this);
    else
      return this.createXULElement();
  }

  this.createXULElement = function() {
    // XXX: clone a prototypical XUL element instead of hardcoding these
    //   attributes
    var menu = document.createElement("menu");
    menu.setAttribute("id", this.xulElementId);
    menu.setAttribute("label", this.linkType);
  //  menu.setAttribute("dir", "rtl");
    menu.setAttribute("disabled", "true");
    menu.setAttribute("class", "menu-iconic bookmark-item");
    menu.setAttribute("container", "true");

    document.getElementById("more-menu-popup").appendChild(menu);

    return menu;
  }

  this.getPopup = function() {
    if (!this.__proto__.getPopup.apply(this))
      this.getXULElement().appendChild(this.createPopup());

    return this.__proto__.getPopup.apply(this)
  }

  this.createPopup = function() {
    var popup = document.createElement("menupopup");
    popup.setAttribute("id", this.xulPopupId);
    return popup;
  }

  this.clear = function() {
    this.__proto__.clear.apply(this);
    this.getXULElement().hidden = true;
  }

  this.displayLink = function(linkElement) {
    if(!this.__proto__.displayLink.apply(this, [linkElement])) return false;
    this.getXULElement().hidden = false;
    // Show the 'miscellaneous' separator
   // document.getElementById("misc-separator").hidden = false;
    return true;
  }
}
LinkToolbarTransientMenu.prototype = new LinkToolbarMenu;
