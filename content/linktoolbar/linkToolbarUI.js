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


var gLinkToolbar = null;
var gLinkToolbarPrefUseLinkGuessing = false;
var gLinkToolbarPrefGuessUpAndTopFromURL = false;
var gLinkToolbarPrefGuessPrevAndNextFromURL = false;
var gLinkToolbarPrefScanHyperlinks = false;

var gLinkToolbarStatusbar = null; // Firefox's usual statusbar

function linkToolbarStartup() {
  gLinkToolbarStatusbar = document.getElementById("statusbar-display");
  linkToolbarItems.init();

  setTimeout(linkToolbarDelayedStartup, 1); // needs to happen after Fx's delayedStartup()

  // pref listener (sort of)
  var os = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  os.addObserver(linkToolbarPrefObserver, "linktoolbar:prefs-updated", false);
}

function linkToolbarDelayedStartup() {
  linkToolbarLoadPrefs();
  linkToolbarAddHandlers();
  // replace the toolbar customisation callback
  var box = document.getElementById("navigator-toolbox");
  box._preLinkToolbar_customizeDone = box.customizeDone;
  box.customizeDone = linkToolbarToolboxCustomizeDone;
}

function linkToolbarShutdown() {
  // unhook pref listener (to prevent memory leaks)
  var os = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  os.removeObserver(linkToolbarPrefObserver, "linktoolbar:prefs-updated", false);
}

window.addEventListener("load", linkToolbarStartup, false);
window.addEventListener("unload", linkToolbarShutdown, false);


function linkToolbarToolboxCustomizeDone(somethingChanged) {
  if(somethingChanged) {
    linkToolbarItems.updateForToolbarCustomisation();
    linkToolbarRefreshLinks();
  }
  this._preLinkToolbar_customizeDone(somethingChanged);
}


function linkToolbarLoadPrefs() {
  var branch = gPrefService.getBranch("extensions.linktoolbar.");

  gLinkToolbarPrefScanHyperlinks = branch.getBoolPref("scanHyperlinks");
  gLinkToolbarPrefGuessUpAndTopFromURL = branch.getBoolPref("guessUpAndTopFromURL");
  gLinkToolbarPrefGuessPrevAndNextFromURL = branch.getBoolPref("guessPrevAndNextFromURL");

  gLinkToolbarPrefUseLinkGuessing = gLinkToolbarPrefScanHyperlinks
      || gLinkToolbarPrefGuessUpAndTopFromURL || gLinkToolbarPrefGuessPrevAndNextFromURL;
}


var linkToolbarPrefObserver = {
  observe: function(subject, topic, data) {
    linkToolbarLoadPrefs();
  }
};


function linkToolbarAddHandlers() {
  var browser = gBrowser;
  browser.addEventListener("select", linkToolbarTabSelectedHandler, false);
  browser.addEventListener("DOMLinkAdded", linkToolbarLinkAddedHandler, true);
  browser.addEventListener("unload", linkToolbarPageClosedHandler, true);
  browser.addEventListener("pagehide", linkToolbarPageClosedHandler, false);
  browser.addEventListener("DOMContentLoaded", linkToolbarPageLoadedHandler, true);
  browser.addEventListener("pageshow", linkToolbarPageShowHandler, false);
}


function linkToolbarRemoveHandlers() {
  var browser = gBrowser;
  browser.removeEventListener("select", linkToolbarTabSelectedHandler, false);
  browser.removeEventListener("DOMLinkAdded", linkToolbarLinkAddedHandler, true);
  browser.removeEventListener("unload", linkToolbarPageClosedHandler, true);
  browser.removeEventListener("pagehide", linkToolbarPageClosedHandler, true);  
  browser.removeEventListener("DOMContentLoaded", linkToolbarPageLoadedHandler, true);
  browser.removeEventListener("pageshow", linkToolbarPageShowHandler, false);
}


// Used to make the page scroll when the mouse-wheel is used on one of our buttons
function linkToolbarMouseScrollHandler(event) {
  content.scrollBy(0, event.detail);
}


function linkToolbarLinkAddedHandler(event) {
  var elt = event.originalTarget;
  var doc = elt.ownerDocument;
  if(!(elt instanceof HTMLLinkElement) || !elt.href || !(elt.rel || elt.rev)) return;
  var rels = linkToolbarUtils.getLinkRels(elt.rel, elt.rev, elt.type, elt.title);
  if(!rels) return;
  var linkInfo = new LTLinkInfo(elt.href, elt.title, elt.hreflang, elt.media);
  linkToolbarAddLinkForPage(linkInfo, doc, rels);
}


// Really ought to delete/nullify doc.__lt__links on "close" (but not on "pagehide")
function linkToolbarPageClosedHandler(event) {
  // Links like: <a href="..." onclick="this.style.display='none'">.....</a>
  // (the onclick handler could instead be on an ancestor of the link) lead to unload/pagehide
  // events with originalTarget==a text node.  So use ownerDocument (which is null for Documents)
  var doc = event.originalTarget;
  if(!(doc instanceof Document)) doc = doc.ownerDocument;
  // don't clear the links for unload/pagehide from a background tab, or from a subframe
  if(doc != gBrowser.contentDocument) return;
  linkToolbarItems.clearAll();
}


function linkToolbarPageLoadedHandler(event) {
  var doc = event.originalTarget;
  if(!gLinkToolbarPrefUseLinkGuessing) return;
  if(!(doc instanceof HTMLDocument)) return;
  const win = doc.defaultView;
  if(win != win.top) return;

  if(doc._linkToolbar_haveGuessedLinks) return;
  doc._linkToolbar_haveGuessedLinks = true;

  const links = doc.__lt__links || (doc.__lt__links = []);

  if(gLinkToolbarPrefScanHyperlinks)
    linkToolbarLinkFinder.scanPageLinks(doc, links);

  const protocol = doc.location.protocol;
  if(!/^(?:https|http|ftp)\:$/.test(protocol)) return;

  if(gLinkToolbarPrefGuessUpAndTopFromURL) {
    if(!links.up) {
      var upUrl = linkToolbarUtils.guessUpUrl(doc.location);
      if(upUrl) linkToolbarAddLinkForPage(new LTLinkInfo(upUrl), doc, {up: true});
    }
    if(!links.top) {
      var topUrl = linkToolbarUtils.guessTopUrl(doc.location);
      if(topUrl) linkToolbarAddLinkForPage(new LTLinkInfo(topUrl), doc, {top: true});
    }
  }
  if(gLinkToolbarPrefGuessPrevAndNextFromURL)
    linkToolbarLinkFinder.guessPrevAndNextFromURL(doc, !links.prev, !links.next);
}


function linkToolbarTabSelectedHandler(event) {
  if(event.originalTarget.localName != "tabs") return;
  linkToolbarRefreshLinks();
}


function linkToolbarPageShowHandler(event) {
  const doc = event.originalTarget;
  if(doc == gBrowser.contentDocument) linkToolbarRefreshLinks();
}


function linkToolbarRefreshLinks() {
  linkToolbarItems.clearAll();
  var doc = content.document;
  if(!doc.__lt__links) return;
  linkToolbarItems.handleLinksForRels(doc.__lt__links);
}


function linkToolbarAddLinkForPage(linkInfo, doc, rels) {
  // remember the link in an array on the document
  // xxx we'd prefer not to pollute the document's DOM of course, but javascript
  // doesn't have real hashtables (only string->anything maps), so there isn't
  // all that much choice.
  // xxx this doesn't work (at all) with XPCNativeWrappers as of 20050712
  var doclinks = doc.__lt__links || (doc.__lt__links = []);
  for(var r in rels) {
    if(!(r in doclinks)) doclinks[r] = [];
    // we leave any existing link with the same URL alone so that linkToolbarLinkFinder-generated
    // links don't replace page-provided ones (which are likely to have better descriptions)
    var url = linkInfo.url;
    if(url in doclinks[r]) delete rels[r];
    else doclinks[r][url] = linkInfo;
  }

  if(doc == content.document) linkToolbarItems.handleLinkForRels(linkInfo, rels);
}



// Code to show urls in the status bar (setting statustext attribute does zilch).
// Rather complex because it worries about restoring the old text, and only doing so if something else hasn't modified the text in the meantime.

var gLinkToolbarOldStatusbarText = null;

function linkToolbarMouseEnter(e) {
  const t = e.target;
  const href = t.getAttribute("href");
  if(!href) return;
  gLinkToolbarOldStatusbarText = gLinkToolbarStatusbar.getAttribute("label");
  gLinkToolbarStatusbar.setAttribute("label", href);
}

function linkToolbarMouseExit(e) {
  const t = e.target;
  const href = t.getAttribute("href");
  const txt = gLinkToolbarStatusbar.getAttribute("label");
  if(txt==href) gLinkToolbarStatusbar.setAttribute("label", gLinkToolbarOldStatusbarText);
  gLinkToolbarOldStatusbarText = null;
}


function linkToolbarFillTooltip(tooltip, event) {
  const elt = document.tooltipNode, line1 = tooltip.firstChild, line2 = tooltip.lastChild;
  const text1 = elt.getAttribute("tooltiptext1") || elt.getAttribute("tooltiptext0");
  const text2 = elt.getAttribute("href");
  line1.hidden = !(line1.value = text1);
  line2.hidden = !(line2.value = text2);
  // don't show the tooltip if it's over a submenu of the More menu
  return !(!text1 && !text2); // return a bool, not a string
}

function linkToolbarItemClicked(e) {
  if(e.button != 1) return;
  linkToolbarLoadPage(e);
  // close any menus
  var p = e.target.parentNode;
  while(p.localName!="toolbarbutton") {
    if(p.localName=="menupopup") p.hidePopup();
    p = p.parentNode;
  }
}

function linkToolbarButtonRightClicked(e) {
  const t = e.target, ot = e.originalTarget;
  if(ot.localName=="toolbarbutton" && t.haveLinks) t.firstChild.showPopup();
}

function linkToolbarLoadPage(e) {
  const url = e.target.getAttribute("href");
  const sourceURL = content.document.documentURI; //e.target.ltSourceURL;
  const button = e.type=="command" ? 0 : e.button;
  // Construct a fake event to pass to handleLinkClick(event, href, linkNode)
  // to make it extract the correct source URL. 
  const fakeEvent = {
    metaKey: e.metaKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey,
    altKey: e.altKey, button: button, preventBubble: function() {},
    target: { ownerDocument: { location : { href: sourceURL }}}
  };
  // handleLinkClick deals with modified left-clicks, and middle-clicks
  const didHandleClick = handleLinkClick(fakeEvent, url, null);
  if(didHandleClick || button != 0) return;
  linkToolbarLoadPageInCurrentBrowser(url, sourceURL);
}

// only works for linkType=top/up/first/prev/next/last (i.e. only for buttons)
// used for keyboard shortcut handling
function linkToolbarGo(linkType) {
  const item = linkToolbarItems.getItem(linkType);
  if(!item || !item.haveLink) return;
  const url = item.getAttribute("href");
  const sourceURL = content.document.documentURI; // item.ltSourceURL;
  linkToolbarLoadPageInCurrentBrowser(url, sourceURL);
}

function linkToolbarLoadPageInCurrentBrowser(url, sourceURL) {
  // urlSecurityCheck changed signature in rev 1.77 of contentAreaUtils.js
  // (i.e. btwn Fx 1.0.x and 1.5 beta). isn't this fun?
  if("getContentFrameURI" in window) // happens to coincide with the change
    urlSecurityCheck(url, document); // yes, it wants the XUL doc.
  else
    urlSecurityCheck(url, sourceURL);
  gBrowser.loadURI(url);
  content.focus();
}
