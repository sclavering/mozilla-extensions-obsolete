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
  showOnlyWhenNeeded: false,
  iconsOnly: false,

  useLinkGuessing: false,
  guessUpAndTopFromURL: false,
  guessNextAndPrevFromURL: false,
  scanHyperlinks: false,

  load: function() {
//    const prefs = ["showOnlyWhenNeeded","iconsOnly","guessUpAndTopFromURL","guessNextAndPrevFromURL","scanHyperlinks"];
    const prefs = ["showOnlyWhenNeeded","iconsOnly","useLinkGuessing"];

    var branch = Components.classes["@mozilla.org/preferences;1"]
                           .getService(Components.interfaces.nsIPrefService)
                           .getBranch("extensions.linktoolbar.");
    for(var i in prefs) this[prefs[i]] = branch.getBoolPref(prefs[i]);

//    this.useLinkGuessing = this.guessUpAndTopFromURL || this.guessNextAndPrevFromURL || this.scanHyperlinks;

    var lt = document.getElementById("linktoolbar");
    if(this.showOnlyWhenNeeded) lt.setAttribute("showOnlyWhenNeeded","true");
    else lt.removeAttribute("showOnlyWhenNeeded");
    if(this.iconsOnly) lt.setAttribute("iconsonly","true");
    else lt.removeAttribute("iconsonly");
  },

  init: function() {
    this.load();
    // xxx register this obj. as a pref observer so changes in our Options panel can apply to open windows
  }
};




var linkToolbarUI = {
  // scope is weird throught this function (|this| refers to the function itself)
  linkAdded: function(event) {
    var element = event.originalTarget;
    var doc = element.ownerDocument;
    if(!((element instanceof HTMLLinkElement) && element.href && (element.rel || element.rev))) return;

    var linkInfo = linkToolbarUtils.getLinkElementInfo(element);
    linkToolbarUI.addLink(linkInfo, doc);
  },

  // rels is a map from link rel values to |true|
  addLink: function(linkInfo, doc) {
    if(!linkInfo) return;
    if(doc == window._content.document) {
      linkToolbarItems.handleLink(linkInfo);
      this.hasItems = true;
    }
    // remember the link in an array on the document
    // xxx we'd prefer not to pollute the document's DOM of course, but javascript
    // doesn't have hashtables (only string->anything maps), so there isn't all that
    // much choice.
    if(!("__lt__links" in doc)) doc.__lt__links = [];
    var doclinks = doc.__lt__links;
    if(doclinks.empty) doclinks.empty = false; // |length| is 0 for hashtables
    for(var r in linkInfo.relValues) {
      if(!(r in doclinks)) doclinks[r] = [];
      doclinks[r].push(linkInfo);
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
    var doc = window._content.document;
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

    if((doc instanceof HTMLDocument) && linkToolbarPrefs.useLinkGuessing) linkFinder.findLinks(doc);

    if(doc != gBrowser.contentDocument) return;

    // xxx can we just set this to false?
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

  // called whenever something on the toolbar gets an onclick event
  // (onclick used to get middle-clicks.  otherwise we would use oncommand)
  // xxx yuck. the functions added for bug 246719 will allow this to be greatly simplified
  commanded: function(event) {
    // ignore right clicks
    if(event.button==2) return;

    // Return if this is one of the menubuttons.
    if(event.target.getAttribute("type") == "menu") return;
    if(!event.target.getAttribute("href")) return;

    // hide the menupopups (middle clicks don't do this by themselves)
    if(event.button==1) {
      var p = event.target.parentNode;
      var linkbar = document.getElementById("linktoolbar");
      while(p!=linkbar) {
        if(p.localName=="menupopup") p.hidePopup();
        p = p.parentNode;
      }
    }

    var destURL = event.target.getAttribute("href");
    try {
      // we need to do a security check because we're loading this url from chrome
      var ssm = Components.classes["@mozilla.org/scriptsecuritymanager;1"].getService()
                          .QueryInterface(Components.interfaces.nsIScriptSecurityManager);
      ssm.checkLoadURIStr(window.content.location.href, destURL, 0);
    } catch(e) {
      dump("LinkToolbar Error: it is not permitted to load this URI from a <link> element: " + e);
      return;
    }

    // XXX use pref listeners rather than checking every time
    var openTabs = true, openTabsInBackground = true;
    try {
      openTabs = gPrefService.getBoolPref("browser.tabs.opentabfor.middleclick")
      openTabsInBackground = gPrefService.getBoolPref("browser.tabs.loadInBackground");
    } catch(e) {}

    // handle middleclick/ctrl+click/shift+click (nearly) as for links in page
    if(event.button==1 && openTabs || event.ctrlKey) {
      // This is a hack to invert the open-in-background behaviour for new tabs
      // It ensures that a click opens in foreground, shift+click in background
      var e = openTabsInBackground ? {shiftKey: !event.shiftKey} : event;
      openNewTabWith(destURL, null, e, false);
      return;
    }
    if(event.button==1 || event.shiftKey) {
      openNewWindowWith(destURL, null, false);
      return;
    }

    var referrer = Components.classes["@mozilla.org/network/standard-url;1"]
                             .createInstance(Components.interfaces.nsIURI);
    referrer.spec = window.content.location.href;
    loadURI(destURL, referrer);
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
    // return value indicates if the tooltip should be allowed to show
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
