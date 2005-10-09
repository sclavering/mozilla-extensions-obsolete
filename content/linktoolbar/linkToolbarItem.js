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

  buttons: {}, // rel->button map
  items: {},   // rel->item map.  domain does not intersect with domain of .buttons

  // becomes a rel->num map (numbers all > 0)
  _itemPlacement: [
    "top","up","first","prev","next","last","toc","chapter","section","subsection","appendix",
    "glossary","index","help","search","author","copyright","bookmark","alternate"
  ],
  // becomes a rel->true map
  _itemsWhichShouldAlwaysBeMenus: [
    "chapter","section","subsection", "bookmark", "alternate"
  ],

  init: function() {
    const order = this._itemPlacement;
    const placement = this._itemPlacement = {};
    for(var i = 0; i != order.length; ++i) placement[order[i]] = i + 1;
    const menuList = this._itemsWhichShouldAlwaysBeMenus;
    const menus = this._itemsWhichShouldAlwaysBeMenus = {};
    for each(m in menuList) menus[m] = true;
    this._init();
    this._initButtons();
  },

  _init: function() {
    this.moreMenu = document.getElementById("linktoolbar-more-menu");
    this.morePopup = document.getElementById("linktoolbar-more-popup");
  },
  
  _initButtons: function() {
    const btns = {top:true, up:true, first:true, prev:true, next:true, last:true};
    const buttons = this.buttons = {};
    for(var rel in btns) {
      var elt = document.getElementById("linktoolbar-"+rel);
      if(elt) buttons[rel] = initLinkToolbarButton(elt, rel);
    }
  },  

  // called after toolbar customisation is finished.  must stop using any items that are no longer present,
  // and destroy any menus/menuitems for which a button is now present
  updateForToolbarCustomisation: function() {
    this._init();    
    for each(var btn in this.buttons) btn.clear();
    this._initButtons();
    const buttons = this.buttons, items = this.items, moreMenu = this.moreMenu;
    for(var rel in items) {
      var item = items[rel];
      if(!buttons[rel] && moreMenu) continue;
      item.destroy();
      delete items[rel];
    }
    // Can end up incorrectly enabled if e.g. only the Top menuitem was active,
    // and that gets replaced by a button.
    if(moreMenu) moreMenu.disabled = true;
  },

  handleLinkForRels: function(linkInfo, rels) {
    var enableMoreMenu = false;
    for(var rel in rels) {
      var item = this.getItem(rel);
      if(!item) continue;
      item.addLink(linkInfo);
      if(item instanceof LinkToolbarItem) enableMoreMenu = true;
    }
    if(enableMoreMenu) this.moreMenu.disabled = false;
  },

  // rels is a rel->{url->linkInfo} map
  // assumes no handleLinkForRels since the last clearAll (which is OK)
  handleLinksForRels: function(rels) {
    var enableMoreMenu = false;
    for(var rel in rels) {
      var item = this.getItem(rel);
      if(!item) continue;
      if(item instanceof LinkToolbarItem) enableMoreMenu = true;
      item.replaceLinks(rels[rel]);
    }
    if(enableMoreMenu) this.moreMenu.disabled = false;
  },

  clearAll: function() {
    for each(var btn in this.buttons) btn.clear();
    for each(var item in this.items) item.clear();
    if(this.moreMenu) this.moreMenu.disabled = true;
  },

  onMoreMenuShowing: function() {
    for each(var item in this.items) item.show();
  },

  onMoreMenuHidden: function() {
    for each(var item in this.items) item._isShowing = false;
    const kids = this.morePopup.childNodes, num = kids.length;
    for(var i = 0; i != num; ++i) kids[i].linkToolbarItem._isShowing = false;
  },

  getItem: function(rel) {
    const item = this.buttons[rel] || this.items[rel];
    if(item) return item;
    if(!this.moreMenu) return null;
    const relNum = this._itemPlacement[rel] || Infinity;
    const isMenu = rel in this._itemsWhichShouldAlwaysBeMenus;
    return this.items[rel] =
      isMenu ? new LinkToolbarMenu(rel, relNum) : new LinkToolbarItem(rel, relNum);
  },

  // returns a XULElement to insertBefore(...)
  getInsertionPointFor: function(relNum) {
    if(relNum == Infinity) return null;
    const items = this.items;
    // binary search the childNodes
    const kids = this.morePopup.childNodes, num = kids.length;
    if(!num || kids[num-1].relNum < relNum) return null;
    for(var i = 0, j = num; i + 1 != j; ) {
      var m = Math.floor((i + j) / 2);
      if(kids[m].relNum < relNum) i = m;
      else j = m;
    }
    return kids[i];
  }
};


const linkToolbarItemBase = {
  _linksHaveChanged: true, // has our set of links changed since the menu was last shown
  _menuNeedsRefresh: true,
  _isShowing: false,

  links: [], // an array of LTLinkInfo's
  popup: null,

  addLink: function(link) {
    this.links.push(link);
    this._linksHaveChanged = this._menuNeedsRefresh = true;
    if(this._isShowing) this.show();
  },

  // links is a url->info map
  replaceLinks: function(links) {
    const ls = this.links = [];
    for each(var info in links) ls.push(info);
    this._linksHaveChanged = this._menuNeedsRefresh = true;
    if(this._isShowing) this.show();
  },

  clear: function() {
    this.links = [];
    this._linksHaveChanged = this._menuNeedsRefresh = true;
    if(this._isShowing) this.show();
  },

  show: function() {
    throw "show() not implemented for some link toolbar item";
  },

  destroy: function() {},

  buildMenu: function() {
    if(!this._menuNeedsRefresh) return true;
    this._menuNeedsRefresh = false;    
    const p = this.popup;
    while(p.hasChildNodes()) p.removeChild(p.lastChild);
    const ls = this.links, num = ls.length;
    for(var i = 0; i != num; i++) {
      var l = ls[i];
      // longTitle || url was used in transientitem
      var href = l.url, label = l.longTitle, tooltip = l.title;
      var mi = document.createElement("menuitem");
      mi.className = "menuitem-iconic";
      mi.setAttribute("href", href);
      mi.setAttribute("label", label);
      mi.setAttribute("tooltiptext1", tooltip);
      p.appendChild(mi);
    }
    return true;
  }
};


// Top, Up, First, Prev, Next, and Last menu-buttons
// Hackery employed to disable the dropmarker if there is just one link.
function initLinkToolbarButton(elt, rel) {
  if(elt.alreadyInitialised) return elt;
  elt.alreadyInitialised = true;
  elt.rel = rel;
  // to avoid repetetive XUL
  elt.onmouseover = linkToolbarMouseEnter;
  elt.onmouseout = linkToolbarMouseExit;
  elt.onclick = linkToolbarItemClicked;
  elt.oncontextmenu = linkToolbarButtonRightClicked;
  elt.setAttribute("oncommand", "linkToolbarLoadPage(event);"); // .oncommand does not exist
  elt.setAttribute("context", "");
  elt.setAttribute("tooltip", "linktoolbar-tooltip");
  elt.addEventListener("DOMMouseScroll", linkToolbarMouseScrollHandler, false);
  for(var i in linkToolbarButton) elt[i] = linkToolbarButton[i];
  elt.links = []; // each button needs its own array, not a reference to a shared one
  var popup = elt.popup = document.createElement("menupopup");
  elt.appendChild(popup);
  popup.setAttribute("onpopupshowing", "return this.parentNode.buildMenu();");
  // hackish
  var anonKids = document.getAnonymousNodes(elt);
  elt.dropMarker = anonKids[anonKids.length-1];
  return elt;
};

const linkToolbarButton = {
  __proto__: linkToolbarItemBase,
  _isShowing: true,

  show: function() {
    this._linksHaveChanged = false;
    const links = this.links;
    this.disabled = !links.length;
    switch(links.length) {
    case 0:
      this.removeAttribute("href");
      this.removeAttribute("tooltiptext1");
      this.removeAttribute("multi");
      break;
    case 1:
      const link = links[0];
      this.setAttribute("href", link.url);
      this.setAttribute("tooltiptext1", link.longTitle);
      // just setting .disabled will not do anything, presumably because the
      // dropmarker xbl:inherits the toolbarbutton's disabled attribute.
      this.dropMarker.setAttribute("disabled","true");
      break;
    default:
      this.dropMarker.removeAttribute("disabled");
      this.setAttribute("multi", "true");
    }
  }
};


// switches automatically between being a single menu item and a whole sub menu
function LinkToolbarItem(rel, relNum) {
  this.links = [];
  this.rel = rel;
  this.relNum = relNum
}
LinkToolbarItem.prototype = {
  __proto__: linkToolbarItemBase,

  menuitem: null,
  menu: null,
  popup: null,

  destroy: function() {
    const i = this.menuitem, m = this.menu, p = this.popup;
    if(!i) return;
    delete i.linkToolbarItem; i.parentNode.removeChild(i);
    delete m.linkToolbarItem; m.parentNode.removeChild(m);
    delete p.linkToolbarItem;
    this.menuitem = this.menu = this.popup = null;
  },

  show: function() {
    this._isShowing = true;  
    if(!this._linksHaveChanged) return;
    this._linksHaveChanged = false;    
    const links = this.links, numLinks = links.length;
    if(!this.menuitem) {
      if(!numLinks) return;
      this.createElements();
    }
    const mi = this.menuitem, m = this.menu;
    switch(numLinks) {
    case 0:
      mi.hidden = true;
      m.hidden = true;
      break;
    case 1:
      const link = links[0];
      m.hidden = true;
      mi.setAttribute("href", link.url);
      mi.hidden = false;
      mi.setAttribute("tooltiptext1", link.longTitle);
      break;
    default:
      mi.hidden = true;
      m.hidden = false;
    }
  },

  createElements: function() {
    const rel = this.rel;  
    const mi = this.menuitem = document.createElement("menuitem");
    const relStr = linkToolbarStrings[rel] || rel;
    mi.className = "menuitem-iconic";
    mi.setAttribute("label", relStr);
    const m = this.menu = document.createElement("menu");
    m.setAttribute("label", linkToolbarStrings["2"+rel] || relStr);
    m.hidden = true;
    m.className = "menu-iconic";
    m.setAttribute("container", "true");
    const p = this.popup = document.createElement("menupopup");
    p.setAttribute("onpopupshowing", "this.linkToolbarItem.buildMenu();");

    mi.linkToolbarItem = m.linkToolbarItem = p.linkToolbarItem = this;
    mi.relNum = m.relNum = this.relNum;

    m.appendChild(p);
    const where = linkToolbarItems.getInsertionPointFor(this.relNum);
    const morePopup = linkToolbarItems.morePopup;
    if(where) {
      morePopup.insertBefore(m, where);
      morePopup.insertBefore(mi, where);
    } else {
      morePopup.appendChild(m);
      morePopup.appendChild(mi);
    }
  }
};


// an item that's always a submenbu (e.g. Chapters)
function LinkToolbarMenu(rel, relNum) {
  this.links = [];
  this.rel = rel;
  this.relNum = relNum;
}
LinkToolbarMenu.prototype = {
  __proto__: LinkToolbarItem.prototype,

  show: function() {
    this._isShowing = true;  
    if(!this._linksHaveChanged) return;
    this._linksHaveChanged = false;
    const links = this.links, numLinks = links.length;
    if(!this.menuitem) {
      if(!numLinks) return;
      this.createElements();
      this.menuitem.hidden = true; // we never use it
    }
    this.menu.hidden = numLinks == 0;
  }
};
