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
 *   Christopher Hoess <choess@force.stwing.upenn.edu>
 *   Tim Taylor <tim@tool-man.org>
 *   Henri Sivonen <henris@clinet.fi>
 *   Stuart Ballard <sballard@netreach.net>
 *   Chris Neale <cdn@mozdev.org> [Port to Px]
 *   Stephen Clavering <mozilla@clav.me.uk>
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


var linkToolbarPrefs = {
  useLinkGuessing: false,
  guessUpAndTopFromURL: false,
  guessPrevAndNextFromURL: false,
  scanHyperlinks: false,

  load: function() {
    const prefs = ["scanHyperlinks","guessUpAndTopFromURL","guessPrevAndNextFromURL"];

    var branch = Components.classes["@mozilla.org/preferences;1"]
                           .getService(Components.interfaces.nsIPrefService)
                           .getBranch("extensions.linktoolbar.");
    for(var i in prefs) this[prefs[i]] = branch.getBoolPref(prefs[i]);

    this.useLinkGuessing = this.scanHyperlinks || this.guessUpAndTopFromURL || this.guessPrevAndNextFromURL;

    var lt = document.getElementById("linktoolbar");
    if(branch.getBoolPref("showOnlyWhenNeeded")) lt.setAttribute("showOnlyWhenNeeded","true");
    else lt.removeAttribute("showOnlyWhenNeeded");
    if(branch.getBoolPref("iconsOnly")) lt.setAttribute("iconsonly","true");
    else lt.removeAttribute("iconsonly");
  },

  init: function() {
    this.load();

    window.addEventListener("unload", this.unload, false);

    var os = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    os.addObserver(this, "linktoolbar:prefs-updated", false);
  },

  unload: function(e) {
    // I hear it causes memory leaks if you don't do this kind of thing
    var os = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    os.removeObserver(linkToolbarPrefs, "linktoolbar:prefs-updated", false);
  },

  observe: function(subject, topic, data) {
    this.load();
  }
};




var linkToolbarUI = {
  linkAdded: function(event) {
    var elt = event.originalTarget;
    var doc = elt.ownerDocument;
    if(!((elt instanceof HTMLLinkElement) && elt.href && (elt.rel || elt.rev))) return;

    var rels = linkToolbarUtils.getLinkRels(elt.rel, elt.rev);
    if(!rels) return;
    var linkInfo = new LTLinkInfo(elt.href, elt.title, elt.hreflang, elt.media);
    linkToolbarUI.addLink(linkInfo, doc, rels);
  },

  addLink: function(linkInfo, doc, rels) {
    // remember the link in an array on the document
    // xxx we'd prefer not to pollute the document's DOM of course, but javascript
    // doesn't have real hashtables (only string->anything maps), so there isn't
    // all that much choice.
    if(!("__lt__links" in doc)) doc.__lt__links = [];
    var doclinks = doc.__lt__links;
    if(doclinks.empty) doclinks.empty = false; // |length| is 0 for hashtables
    for(var r in rels) {
      if(!(r in doclinks)) doclinks[r] = [];
      // we leave any existing link with the same URL alone so that linkToolbarLinkFinder-generated
      // links don't replace page-provided ones (which are likely to have better descriptions)
      var url = linkInfo.href;
      if(url in doclinks[r]) delete rels[r];
      else doclinks[r][url] = linkInfo;
    }

    if(doc == content.document) {
      linkToolbarItems.handleLinkForRels(linkInfo, rels);
      this.hasItems = true;
    }
  },

  clear: function(event) {
    // When following a link of the form:
    //   <a href="..." onclick="this.style.display='none'">.....</a>
    //   (the onclick handler could be on an ancestor node of the link instead)
    // the originalTarget of the unload event for leaving the current page becomes the Text node
    // for the link, rather than the Document node.  So we use ownerDocument, but can't always do
    // so, because the DOM2 spec defines that as being null for Document nodes.
    var doc = event.originalTarget;
    if(!(doc instanceof Document)) doc = doc.ownerDocument;
    // we only want to clear the toolbar if it's the currently visible document that is unloading
    if(doc != gBrowser.contentDocument) return;
    linkToolbarItems.clearAll();
  },

  tabSelected: function(event) {
    if(event.originalTarget.localName != "tabs") return;
    linkToolbarItems.clearAll();

    // show any links for the new doc
    var doc = content.document;
    if(!("__lt__links" in doc) || doc.__lt__links.empty) {
      linkToolbarUI.hasItems = false;
      return;
    }

    var links = doc.__lt__links;
    for(var rel in links) {
      var linksForRel = links[rel];
      for(var i in linksForRel) linkToolbarItems.handleLinkForRel(linksForRel[i], rel);
    }
    linkToolbarUI.hasItems = true;
  },

  // When in "show as needed" mode we leave the bar visible after a page unloads
  // until the next page has loaded and we can be sure it has no links, at which
  // point this function is called.
  pageLoaded: function(evt) {
    var doc = evt.originalTarget;
    if(!("__lt__links" in doc)) {
      doc.__lt__links = [];
      doc.__lt__links.empty = true; // |length| is 0 for hashtables. ltUI.addLink sets this to false
    }

    if(linkToolbarPrefs.useLinkGuessing && (doc instanceof HTMLDocument)) {
      if(linkToolbarPrefs.scanHyperlinks)
        linkToolbarLinkFinder.scanPageLinks(doc, doc.__lt__links);
      // is doc.location.href always defined? and are there any security issues with it?
      if(linkToolbarPrefs.guessUpAndTopFromURL)
        linkToolbarLinkFinder.guessUpAndTopFromURL(doc, doc.__lt__links, doc.location.href);
      if(linkToolbarPrefs.guessPrevAndNextFromURL)
        linkToolbarLinkFinder.guessPrevAndNextFromURL(doc, doc.__lt__links, doc.location.href);
    }

    if(doc != gBrowser.contentDocument) return;

    linkToolbarUI.hasItems = !doc.__lt__links.empty;
  },

  // The "hasitems" attribute is used to show/hide the toolbar in the
  // "show when needed" mode. This property is used to set/clear it
  _hasItems: false,
  set hasItems(val) {
    if(val==this._hasItems) return;
    document.getElementById("linktoolbar").setAttribute("hasitems",val);
    this._hasItems = val;
  },
  get hasItems() {
    return this._hasItems;
  },

  // multiline tooltips.  text is loaded from tooltiptext[012] attributes
  fillTooltip: function(tooltipElement) {
    var text1 = tooltipElement.getAttribute("tooltiptext1")
             || tooltipElement.getAttribute("tooltiptext0");
    var line1 = document.getElementById("linktoolbar-tooltip-1");
    line1.hidden = !(line1.value = text1);
    var text2 = tooltipElement.getAttribute("tooltiptext2");
    var line2 = document.getElementById("linktoolbar-tooltip-2");
    line2.hidden = !(line2.value = text2);
    // return value indicates if the tooltip should be shown
    return !!(text1 || text2);
  },

  onload: function() {
    var contentArea = document.getElementById("appcontent");
    contentArea.addEventListener("select", linkToolbarUI.tabSelected, false);
    contentArea.addEventListener("DOMLinkAdded", linkToolbarUI.linkAdded, true);
    contentArea.addEventListener("unload", linkToolbarUI.clear, true);
    contentArea.addEventListener("load", linkToolbarUI.pageLoaded, true);
    linkToolbarPrefs.init();
  }
};

window.addEventListener("load", linkToolbarUI.onload, false);



function linkToolbarLoadPage(e, isMiddleClick) {
  var url = e.target.getAttribute("href");

  urlSecurityCheck(url, document); // in contentAreaUtils.js, throws an exception if check fails.
  openUILink(url, e, false, true); // in utilityOverlay.js

  // close any menus if it was a middle-click
  // closeMenus() in utilityOverlay.js is poorly written (uses tagName, amongst other things), and appears incapable of handling nested menus
  if(!isMiddleClick) return;
  var p = event.target.parentNode;
  var linkbar = document.getElementById("linktoolbar");
  while(p!=linkbar) {
    if(p.localName=="menupopup") p.hidePopup();
    p = p.parentNode;
  }
}
