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

/**
LinkToolbarItem and its subclasses represent the buttons, menuitems, and menus
that handle the various link types.  Each type must implement the methods:
  clear()
    stop displaying any links this item is currently displaying
  displayLink(link)
    display the link, which is a LTLinkInfo() object (see linkToolbarHandler.js)

The command/click-handling code expects menuitems/toolbarbuttons to have an href
attribute, and the multiline tooltip we use expects things to have "tooltiptext1"
and "tooltiptext2" attributes (though they can be empty).

XXX
All of this really need redoing so that menu items are only created when the menu
is opened, rather than when a link is found.
*/


// helper for toolbar buttons and transient items
function makeLinkToolbarMenuItem(href, label, tooltip) {
  var mi = document.createElement("menuitem");
  mi.className = "menuitem-iconic bookmark-item";
  mi.setAttribute("href", href);
  mi.setAttribute("label", label);
  mi.setAttribute("tooltiptext1", tooltip);
  mi.setAttribute("tooltiptext2", href);
  return mi;
}



function LinkToolbarItem (linkType, element) {
  this.linkType = linkType;
  this.xulElement = element;
  // this will need fixing if we ever have more than one top-level menu
  this.parentMenuButton = document.getElementById("more-menu");
}
LinkToolbarItem.prototype = {
  clear: function() {
    this.parentMenuButton.disabled = true;
    this.xulElement.disabled = true;
    this.xulElement.hidden = true;
    this.xulElement.removeAttribute("href");
    this.xulElement.removeAttribute("tooltiptext1");
    this.xulElement.removeAttribute("tooltiptext2");
  },

  displayLink: function(linkElement) {
    if(this.xulElement.hasAttribute("href")) return;
    this.parentMenuButton.disabled = false;
    this.xulElement.disabled = false;
    this.xulElement.hidden = false;
    this.xulElement.setAttribute("href", linkElement.url);
    this.xulElement.setAttribute("tooltiptext1", linkElement.longTitle);
    this.xulElement.setAttribute("tooltiptext2", linkElement.url);
  }
};



// Top, Up, First, Prev, Next, and Last menu-buttons
// Hackery employed to disable the dropmarker if there is just one link.
function initLinkToolbarButton(linkType, elt) {
  elt.linkType = linkType;
  elt.links = []; // must do this so each button has its own array rather than a reference to a shared one
  var popup = elt.popup = document.createElement("menupopup");
  elt.appendChild(popup);
  popup.setAttribute("onpopupshowing", "return this.parentNode.buildMenu();");
  // hackish
  var anonKids = document.getAnonymousNodes(elt);
  elt.dropMarker = anonKids[anonKids.length-1];
  // copy methods
  for(var i in linkToolbarButton) elt[i] = linkToolbarButton[i];
  return elt;
}

const linkToolbarButton = {
  haveLink: false, // indicates the button is showing 1 or more links
  haveLinks: false, // indicates the button has >= 2 links
  // links: [], // an array of links for this button (set in above function)
  linksHaveChanged: true, // has our set of links changed since the menu was last shown

  clear: function() {
    this.haveLink = this.haveLinks = false;
    this.linksHaveChanged = true;
    this.links = [];
    this.disabled = true;
    this.removeAttribute("href");
    this.removeAttribute("tooltiptext1");
    this.removeAttribute("tooltiptext2");
  },

  displayLink: function(linkElement) {
    this.linksHaveChanged = true;
    this.links.push(linkElement);
    if(!this.haveLink) {
      this.haveLink = true;
      this.disabled = false;
      this.setAttribute("href", linkElement.url);
      this.setAttribute("tooltiptext1", linkElement.longTitle);
      this.setAttribute("tooltiptext2", linkElement.url);
      // just setting .disabled will not do anything, presumably because the
      // dropmarker xbl:inherits the toolbarbutton's disabled attribute.
      this.dropMarker.setAttribute("disabled","true");
    } else if(!this.haveLinks) {
      this.haveLinks = true;
      this.dropMarker.removeAttribute("disabled");
    }
  },

  buildMenu: function() {
    if(!this.haveLinks) return false;
    if(!this.linksHaveChanged) return true;

    const p = this.popup;
    while(p.hasChildNodes()) p.removeChild(p.lastChild);

    const ls = this.links, num = ls.length;
    for(var i = 0; i != num; i++) {
      var l = ls[i];
      p.appendChild(makeLinkToolbarMenuItem(l.url, l.longTitle, l.title));
    }
    this.linksHaveChanged = false;
    return true;
  }
};



function initLinkToolbarMenu(linkType, elt) {
  for(var i in linkToolbarMenu) elt[i] = linkToolbarMenu[i];
  elt.links = []; // do not remove this
  elt.linkType = linkType;
  var popup = elt.popup = document.createElement("menupopup");
  popup.setAttribute("onpopupshowing", "this.parentNode.buildMenu();");
  elt.appendChild(popup);
  // this will need fixing if we ever have more than one top-level menu
  elt.parentMenuButton = document.getElementById("more-menu");
  return elt;
}

const linkToolbarMenu = {
  links: [],
  linksHaveChanged: true, // has the set of links changed since the menu was last shown?

  clear: function() {
    this.parentMenuButton.disabled = true;
    this.hidden = true;
    this.linksHaveChanged = true;
  },

  displayLink: function(link) {
    this.linksHaveChanged = true;
    this.hidden = false;
    this.parentMenuButton.disabled = false;
    this.links.push(link);
  },

  buildMenu: function() {
    if(!this.linksHaveChanged) return;
    this.linksHaveChanged = false;
    const p = this.popup;
    while(p.hasChildNodes()) p.removeChild(p.lastChild);
    const ls = this.links, num = ls.length;
    for(var i = 0; i != num; i++) {
      var l = ls[i];
      p.appendChild(makeLinkToolbarMenuItem(l.url, l.longTitle, l.title));
    }
  }
};



// switches automatically between being a single menu item and a whole sub menu
function LinkToolbarTransientItem(linkType) {
  // create a menuitem
  var item = this.item = document.createElement("menuitem");
  item.className = "menuitem-iconic bookmark-item";
  item.setAttribute("label",linkType);
  // and a menu
  var menu = this.menu = document.createElement("menu");
  menu.setAttribute("label",linkType);
  menu.hidden = true;
  menu.className = "menu-iconic bookmark-item";
  menu.setAttribute("container", "true");
  // create the popup to go with it
  var popup = this.popup = document.createElement("menupopup");
  menu.appendChild(popup);
  // add items and create object to control them
  var moreMenu = this.parentMenuButton = document.getElementById("more-menu-popup");
  moreMenu.appendChild(item);
  moreMenu.appendChild(menu);
}

LinkToolbarTransientItem.prototype = {
  haveLink: false,
  haveLinks: false,

  clear: function() {
    this.haveLink = false;
    this.haveLinks = false;
    this.item.hidden = true;
    this.menu.hidden = true;
    const p = this.popup;
    while(p.hasChildNodes()) p.removeChild(p.lastChild);
    this.parentMenuButton.disabled = true;
  },

  displayLink: function(linkInfo) {
    // handle the first link
    if(!this.haveLink) {
      this.haveLink = true;
      this.item.setAttribute("href", linkInfo.url);
      this.item.hidden = false;
      this.item.setAttribute("tooltiptext1", linkInfo.longTitle);
      this.item.setAttribute("tooltiptext2", linkInfo.url);
      this.parentMenuButton.disabled = false;
    } else if(!this.haveLinks) {
      // handling a second link, so hide item and show menu
      this.haveLinks = true;
      this.item.hidden = true;
      this.menu.hidden = false;
    }
    // add menu item
    const link = linkInfo;
    var mi = makeLinkToolbarMenuItem(link.url, link.longTitle || link.url, link.title);
    this.popup.appendChild(mi);
  }
};
