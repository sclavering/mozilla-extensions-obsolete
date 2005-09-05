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


// controller for all UI bits displaying <link>s
const linkToolbarItems = {
  moreMenu: null,
  morePopup: null,

  items: [], // rel->item map

  // called after toolbar customisation is finished.  must stop using any items that are no longer present,
  // and destroy any menus/menuitems for which a button is now present
  updateForToolbarCustomisation: function() {
    const items = this.items;
    const btns = {top:true, up:true, first:true, prev:true, next:true, last:true};
    const moreMenu = this.moreMenu = document.getElementById("linktoolbar-more-menu");
    this.morePopup = document.getElementById("linktoolbar-more-popup");

    for(var rel in items) {
      var item = items[rel];
      // keep an item that *can* correspond to a button iff:
      //   it was an item on the More menu, and that's still on a toolbar
      //   or it was a button before, and still is one
      if(rel in btns) {
        var btn = document.getElementById("linktoolbar-"+rel);
        if(btn ? item == btn : item instanceof LinkToolbarTransientItem && moreMenu) continue;
      }
      // keep menuitems/submenus only of the More menu is still present
      else if(moreMenu) continue;

      item.destroy();
      delete items[rel];
    }
    
    // Can end up incorrectly enabled if e.g. only the Top menuitem was active,
    // and that gets replaced by a button.
    if(moreMenu) moreMenu.disabled = true;
  },

  handleLinkForRels: function(linkInfo, rels) {
    for(var rel in rels) {
      var item = this.getItem(rel);
      if(item) item.displayLink(linkInfo);
    }
  },

  // rels is a rel->{url->linkInfo} map
  handleLinksForRels: function(rels) {
    for(var rel in rels) {
      var item = this.getItem(rel);
      if(!item) continue;
      var links = rels[rel];
      for(var link in links) item.displayLink(links[link]);
    }
  },

  getItem: function(linkType) {
    const items = this.items;
    if(items[linkType]) return items[linkType];
    const elt = document.getElementById("linktoolbar-" + linkType);
    // initialisation functions for different elements used to display links
    const inits = {toolbarbutton: initLinkToolbarButton, menuitem: initLinkToolbarItem, menu: initLinkToolbarMenu};
    if(elt) return items[linkType] = inits[elt.localName](elt);
    if(!this.moreMenu) return null;
    return items[linkType] = new LinkToolbarTransientItem(linkType);
  },

  clearAll: function() {
    const items = this.items;
    for(var linkType in items) items[linkType].clear();
  }
};



function makeLinkToolbarMenuItem(href, label, tooltip) {
  var mi = document.createElement("menuitem");
  mi.className = "menuitem-iconic";
  mi.setAttribute("href", href);
  mi.setAttribute("label", label);
  mi.setAttribute("tooltiptext1", tooltip);
  return mi;
}



function initLinkToolbarItem(elt) {
  for(var i in linkToolbarItem) elt[i] = linkToolbarItem[i];
  return elt;
}

const linkToolbarItem = {
  haveLink: false,

  destroy: function() {},

  clear: function() {
    linkToolbarItems.moreMenu.disabled = true;
    this.hidden = true;
    this.haveLink = false;
  },

  displayLink: function(link) {
    if(this.haveLink) return;
    this.haveLink = true;
    linkToolbarItems.moreMenu.disabled = false;
    this.hidden = false;
    this.setAttribute("href", link.url);
    this.setAttribute("tooltiptext1", link.longTitle);
  }
};



// Top, Up, First, Prev, Next, and Last menu-buttons
// Hackery employed to disable the dropmarker if there is just one link.
function initLinkToolbarButton(elt) {
  // to avoid repetetive XUL
  elt.onmouseover = linkToolbarMouseEnter;
  elt.onmouseout = linkToolbarMouseExit;
  elt.onclick = linkToolbarItemClicked;
  elt.oncontextmenu = linkToolbarButtonRightClicked;
  elt.setAttribute("oncommand", "linkToolbarLoadPage(event);"); // .oncommand does not exist
  
  elt.addEventListener("DOMMouseScroll", linkToolbarMouseScrollHandler, false);

  elt.inited = true;
  for(var i in linkToolbarButton) elt[i] = linkToolbarButton[i];
  elt.links = []; // each button needs its own array, not a reference to a shared one
  var popup = elt.popup = document.createElement("menupopup");
  elt.appendChild(popup);
  popup.setAttribute("onpopupshowing", "return this.parentNode.buildMenu();");
  // hackish
  var anonKids = document.getAnonymousNodes(elt);
  elt.dropMarker = anonKids[anonKids.length-1];
  return elt;
}

const linkToolbarButton = {
  haveLink: false, // indicates the button is showing 1 or more links
  haveLinks: false, // indicates the button has >= 2 links
  // links: [], // an array of links for this button (set in above function)
  linksHaveChanged: true, // has our set of links changed since the menu was last shown
  
  destroy: function() {},

  clear: function() {
    this.haveLink = this.haveLinks = false;
    this.linksHaveChanged = true;
    this.links = [];
    this.disabled = true;
    this.removeAttribute("href");
    this.removeAttribute("tooltiptext1");
    this.removeAttribute("multi");
  },

  displayLink: function(linkElement) {
    this.linksHaveChanged = true;
    this.links.push(linkElement);
    if(!this.haveLink) {
      this.haveLink = true;
      this.disabled = false;
      this.setAttribute("href", linkElement.url);
      this.setAttribute("tooltiptext1", linkElement.longTitle);
      // just setting .disabled will not do anything, presumably because the
      // dropmarker xbl:inherits the toolbarbutton's disabled attribute.
      this.dropMarker.setAttribute("disabled","true");
    } else if(!this.haveLinks) {
      this.haveLinks = true;
      this.dropMarker.removeAttribute("disabled");
      this.setAttribute("multi", "true");
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



function initLinkToolbarMenu(elt) {
  for(var i in linkToolbarMenu) elt[i] = linkToolbarMenu[i];
  elt.links = []; // do not remove this
  var popup = elt.popup = document.createElement("menupopup");
  popup.setAttribute("onpopupshowing", "this.parentNode.buildMenu();");
  elt.appendChild(popup);
  return elt;
}

const linkToolbarMenu = {
  links: [],
  linksHaveChanged: true, // has the set of links changed since the menu was last shown?
  
  destroy: function() {},

  clear: function() {
    linkToolbarItems.moreMenu.disabled = true;
    this.hidden = true;
    this.links = [];
    this.linksHaveChanged = true;
  },

  displayLink: function(link) {
    this.linksHaveChanged = true;
    this.hidden = false;
    linkToolbarItems.moreMenu.disabled = false;
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
  this.links = [];
  // create a menuitem
  var item = this.item = document.createElement("menuitem");
  item.className = "menuitem-iconic";
  item.setAttribute("label",linkType);
  // and a menu
  var menu = this.menu = document.createElement("menu");
  menu.setAttribute("label",linkType);
  menu.hidden = true;
  menu.className = "menu-iconic";
  menu.setAttribute("container", "true");
  // create the popup to go with it
  var popup = this.popup = document.createElement("menupopup");
  menu.appendChild(popup);
  popup.linkToolbarItem = this;
  popup.setAttribute("onpopupshowing", "this.linkToolbarItem.buildMenu();");
  // add items and create object to control them
  const morePopup = linkToolbarItems.morePopup;
  morePopup.appendChild(item);
  morePopup.appendChild(menu);
}

LinkToolbarTransientItem.prototype = {
  haveLink: false,
  haveLinks: false,
  // links: [],
  linksHaveChanged: true,

  destroy: function() {
    const i = this.item, m = this.menu;
    i.parentNode.removeChild(i);
    m.parentNode.removeChild(m);
  },

  clear: function() {
    this.haveLink = this.haveLinks = false;
    this.links = [];
    this.linksHaveChanged = true;
    this.item.hidden = this.menu.hidden = true;
    linkToolbarItems.moreMenu.disabled = true;
  },

  displayLink: function(link) {
    if(!this.haveLink) {
      this.haveLink = true;
      this.item.setAttribute("href", link.url);
      this.item.hidden = false;
      this.item.setAttribute("tooltiptext1", link.longTitle);
      linkToolbarItems.moreMenu.disabled = false;
    } else if(!this.haveLinks) {
      this.haveLinks = true;
      this.item.hidden = true;
      this.menu.hidden = false;
    }
    this.links.push(link);
    this.linksHaveChanged = true;
  },

  buildMenu: function() {
    if(!this.linksHaveChanged) return;
    this.linksHaveChanged = false;
    const p = this.popup;
    while(p.hasChildNodes()) p.removeChild(p.lastChild);
    const ls = this.links, num = ls.length;
    for(var i = 0; i != num; i++) {
      var l = ls[i];
      p.appendChild(makeLinkToolbarMenuItem(l.url, l.longTitle || l.url, l.title));
    }
  }
};
