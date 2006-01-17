/* ***** BEGIN LICENSE BLOCK *****
Version: MPL 1.1/GPL 2.0/LGPL 2.1

The contents of this file are subject to the Mozilla Public License Version
1.1 (the "License"); you may not use this file except in compliance with
the License. You may obtain a copy of the License at
http://www.mozilla.org/MPL/

Software distributed under the License is distributed on an "AS IS" basis,
WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
for the specific language governing rights and limitations under the
License.

The Original Code is the Site Navigation Toolbar from Mozilla 1.x.

The Initial Developer of the Original Code is Eric Hodel <drbrain@segment7.net>

Portions created by the Initial Developer are Copyright (C) 2001
the Initial Developer. All Rights Reserved.

Contributor(s):
  Christopher Hoess <choess@force.stwing.upenn.edu>
  Tim Taylor <tim@tool-man.org>
  Henri Sivonen <henris@clinet.fi>
  Stuart Ballard <sballard@netreach.net>
  Chris Neale <cdn@mozdev.org>
  Stephen Clavering <mozilla@clav.me.uk>

Alternatively, the contents of this file may be used under the terms of
either the GNU General Public License Version 2 or later (the "GPL"), or
the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
in which case the provisions of the GPL or the LGPL are applicable instead
of those above. If you wish to allow use of your version of this file only
under the terms of either the GPL or the LGPL, and not to allow others to
use your version of this file under the terms of the MPL, indicate your
decision by deleting the provisions above and replace them with the notice
and other provisions required by the GPL or the LGPL. If you do not delete
the provisions above, a recipient may use your version of this file under
the terms of any one of the MPL, the GPL or the LGPL.

***** END LICENSE BLOCK ***** */

const linkWidgetPrefPrefix = "extensions.linkwidget.";

// rels which should always use a submenu of the More menu, even for a single item
const linkWidgetMenuRels = {}; // rel -> true map
const _linkWidgetMenuRels = ["chapter", "section", "subsection", "bookmark", "alternate"];

// known rels in the order they should appear on the More menu
const linkWidgetMenuOrdering = {}; // rel -> int map
const _linkWidgetMenuOrdering = [
  "top","up","first","prev","next","last","toc","chapter","section","subsection","appendix",
  "glossary","index","help","search","author","copyright","bookmark","alternate"
];

const linkWidgetButtonRels = {}; // rel -> true map
const _linkWidgetButtonRels = ["top","up","first","prev","next","last"];

const linkWidgetEventHandlers = {
  "select": "linkWidgetTabSelectedHandler",
  "DOMLinkAdded": "linkWidgetLinkAddedHandler",
  "pagehide": "linkWidgetPageHideHandler",
  "DOMContentLoaded": "linkWidgetPageLoadedHandler",
  "pageshow": "linkWidgetPageShowHandler"
};

var linkWidget = null;
var linkWidgetPrefUseLinkGuessing = false;
var linkWidgetPrefGuessUpAndTopFromURL = false;
var linkWidgetPrefGuessPrevAndNextFromURL = false;
var linkWidgetPrefScanHyperlinks = false;
var linkWidgetStrings = "chrome://linkwidget/locale/main.strings";

var linkWidgetStatusbar = null; // Firefox's usual statusbar

var linkWidgetButtons = {}; // rel -> <toolbarbutton> map
var linkWidgetViews = {};   // rel -> view map, the views typically being a menu+menuitem
var linkWidgetMoreMenu = null;
var linkWidgetMorePopup = null;


function linkWidgetStartup() {
  window.removeEventListener("load", linkWidgetStartup, false);
  linkWidgetStatusbar = document.getElementById("statusbar-display");
  linkWidgetStrings = linkWidgetLoadStringBundle(linkWidgetStrings);
  for(var i in _linkWidgetMenuOrdering) linkWidgetMenuOrdering[_linkWidgetMenuOrdering[i]] = (i-0) + 1;
  for each(i in _linkWidgetMenuRels) linkWidgetMenuRels[i] = true;
  for each(i in _linkWidgetButtonRels) linkWidgetButtonRels[i] = true;
  linkWidgetInitMoreMenu();
  linkWidgetInitVisbileButtons();

  setTimeout(linkWidgetDelayedStartup, 1); // needs to happen after Fx's delayedStartup()
}

function linkWidgetDelayedStartup() {
  linkWidgetLoadPrefs();
  gPrefService.addObserver(linkWidgetPrefPrefix, linkWidgetPrefObserver, false);
  for(var h in linkWidgetEventHandlers)
    gBrowser.addEventListener(h, window[linkWidgetEventHandlers[h]], false);
  // replace the toolbar customisation callback
  var box = document.getElementById("navigator-toolbox");
  box._preLinkWidget_customizeDone = box.customizeDone;
  box.customizeDone = linkWidgetToolboxCustomizeDone;
}

function linkWidgetShutdown() {
  window.removeEventListener("unload", linkWidgetShutdown, false);
  for(var h in linkWidgetEventHandlers)
    gBrowser.addEventListener(h, window[linkWidgetEventHandlers[h]], false);  
  gPrefService.removeObserver(linkWidgetPrefPrefix, linkWidgetPrefObserver);
}

window.addEventListener("load", linkWidgetStartup, false);
window.addEventListener("unload", linkWidgetShutdown, false);


function linkWidgetLoadPrefs() {
  const branch = gPrefService.getBranch(linkWidgetPrefPrefix);
  linkWidgetPrefScanHyperlinks = branch.getBoolPref("scanHyperlinks");
  linkWidgetPrefGuessUpAndTopFromURL = branch.getBoolPref("guessUpAndTopFromURL");
  linkWidgetPrefGuessPrevAndNextFromURL = branch.getBoolPref("guessPrevAndNextFromURL");
  linkWidgetPrefUseLinkGuessing = linkWidgetPrefScanHyperlinks
      || linkWidgetPrefGuessUpAndTopFromURL || linkWidgetPrefGuessPrevAndNextFromURL;
}


var linkWidgetPrefObserver = {
  observe: function(subject, topic, data) {
//    dump("lwpref: subject="+subject.root+" topic="+topic+" data="+data+"\n");
    // there're only three of them
    linkWidgetLoadPrefs();
  }
};


// Used to make the page scroll when the mouse-wheel is used on one of our buttons
function linkWidgetMouseScrollHandler(event) {
  content.scrollBy(0, event.detail);
}


function linkWidgetInitMoreMenu() {
  linkWidgetMoreMenu = document.getElementById("linkwidget-more-menu");
  linkWidgetMorePopup = document.getElementById("linkwidget-more-popup");
}

function linkWidgetInitVisbileButtons() {
  linkWidgetButtons = {};
  for(var rel in linkWidgetButtonRels) {
    var elt = document.getElementById("linkwidget-"+rel);
    if(elt) linkWidgetButtons[rel] = initLinkWidgetButton(elt, rel);
  }
}

function linkWidgetLinkAddedHandler(event) {
  var elt = event.originalTarget;
  var doc = elt.ownerDocument;
  if(!(elt instanceof HTMLLinkElement) || !elt.href || !(elt.rel || elt.rev)) return;
  var rels = linkWidgetGetLinkRels(elt.rel, elt.rev, elt.type, elt.title);
  if(rels) linkWidgetAddLinkForPage(elt.href, elt.title, elt.hreflang, elt.media, doc, rels);
}


// Really ought to delete/nullify doc.linkWidgetLinks on "close" (but not on "pagehide")
function linkWidgetPageHideHandler(event) {
  // Links like: <a href="..." onclick="this.style.display='none'">.....</a>
  // (the onclick handler could instead be on an ancestor of the link) lead to unload/pagehide
  // events with originalTarget==a text node.  So use ownerDocument (which is null for Documents)
  var doc = event.originalTarget;
  if(!(doc instanceof Document)) doc = doc.ownerDocument;
  // don't clear the links for unload/pagehide from a background tab, or from a subframe
  if(doc != gBrowser.contentDocument) return;
  for each(var btn in linkWidgetButtons) btn.show(null);
  if(linkWidgetMoreMenu) linkWidgetMoreMenu.disabled = true;
}


function linkWidgetPageLoadedHandler(event) {
  var doc = event.originalTarget;
  if(!linkWidgetPrefUseLinkGuessing) return;
  if(!(doc instanceof HTMLDocument)) return;
  const win = doc.defaultView;
  if(win != win.top) return;

  if(doc.linkWidgetHasGuessedLinks) return;
  doc.linkWidgetHasGuessedLinks = true;

  const links = doc.linkWidgetLinks || (doc.linkWidgetLinks = {});

  if(linkWidgetPrefScanHyperlinks) linkWidgetScanPageForLinks(doc);

  const protocol = doc.location.protocol;
  if(!/^(?:https|http|ftp)\:$/.test(protocol)) return;

  if(linkWidgetPrefGuessPrevAndNextFromURL)
    linkWidgetGuessPrevNextLinksFromURL(doc, !links.prev, !links.next);

  if(!linkWidgetPrefGuessUpAndTopFromURL) return;
  if(!links.up) {
    var upUrl = linkWidgetGuessUp(doc.location);
    if(upUrl) linkWidgetAddLinkForPage(upUrl, null, null, null, doc, {up: true});
  }
  if(!links.top) {
    var topUrl = location.protocol + "//" + location.host + "/"
    linkWidgetAddLinkForPage(topUrl, null, null, null, doc, {top: true});
  }
}


function linkWidgetTabSelectedHandler(event) {
  if(event.originalTarget.localName != "tabs") return;
  linkWidgetRefreshLinks();
}

// xxx isn't this too keen to refresh?
function linkWidgetPageShowHandler(event) {
  const doc = event.originalTarget;
  if(doc == gBrowser.contentDocument) linkWidgetRefreshLinks();
}


function linkWidgetRefreshLinks() {
  for each(var btn in linkWidgetButtons) btn.show(null);
  if(linkWidgetMoreMenu) linkWidgetMoreMenu.disabled = true;

  const doc = content.document, links = doc.linkWidgetLinks;
  if(!links) return;

  var enableMoreMenu = false;
  for(var rel in links) {
    if(rel in linkWidgetButtons) linkWidgetButtons[rel].show(links[rel]);
    else enableMoreMenu = true;
  }
  if(linkWidgetMoreMenu && enableMoreMenu) linkWidgetMoreMenu.disabled = false;
}


function linkWidgetAddLinkForPage(url, txt, lang, media, doc, rels) {
  const linkInfo = new LinkWidgetLink(url, txt, lang, media);
  // put the link in a rel->[link] map on the document's XPCNativeWrapper
  var doclinks = doc.linkWidgetLinks || (doc.linkWidgetLinks = {});
  for(var r in rels) {
    if(!doclinks[r]) doclinks[r] = [], doclinks[r].urls = {};
    // link guessing often leads to new links with the same URL, which should be ignored
    if(url in doclinks[r].urls) delete rels[r];
    else doclinks[r].push(linkInfo);
  }

  if(doc != content.document) return;
  var enableMoreMenu = false;
  for(var rel in rels) {
    // buttons need updating immediately, but anything else can wait till the menu is showing
    if(rel in linkWidgetButtons) linkWidgetButtons[rel].show(doclinks[rel]);
    else enableMoreMenu = true;
  }
  if(linkWidgetMoreMenu && enableMoreMenu) linkWidgetMoreMenu.disabled = false;
}

function linkWidgetOnMoreMenuShowing() {
  const linkmaps = content.document.linkWidgetLinks;
  // Update all existing views
  for(var rel in linkWidgetViews) linkWidgetViews[rel].show(linkmaps[rel] || null);
  // Create any new views that are needed
  for(rel in linkmaps) {
    if(rel in linkWidgetViews || rel in linkWidgetButtons) continue;
    var relNum = linkWidgetMenuOrdering[rel] || Infinity;
    var isMenu = rel in linkWidgetMenuRels;
    var item = linkWidgetViews[rel] =
      isMenu ? new LinkWidgetMenu(rel, relNum) : new LinkWidgetItem(rel, relNum);
    item.show(linkmaps[rel]);
  }
}

function linkWidgetToolboxCustomizeDone(somethingChanged) {
  this._preLinkWidget_customizeDone(somethingChanged);
  if(!somethingChanged) return;

  linkWidgetInitMoreMenu();
  for each(var btn in linkWidgetButtons) btn.show(null);
  linkWidgetInitVisbileButtons();
  for(var rel in linkWidgetViews) {
    var item = linkWidgetViews[rel];
    if(!linkWidgetButtons[rel] && linkWidgetMoreMenu) continue;
    item.destroy();
    delete linkWidgetViews[rel];
  }
  // Can end up incorrectly enabled if e.g. only the Top menuitem was active,
  // and that gets replaced by a button.
  if(linkWidgetMoreMenu) linkWidgetMoreMenu.disabled = true;

  linkWidgetRefreshLinks();
}



// Code to show urls in the status bar (setting statustext attribute does zilch).
// Rather complex because it worries about restoring the old text, and only doing
// so if something else hasn't modified the text in the meantime.

var linkWidgetOldStatusbarText = null;

function linkWidgetMouseEnter(e) {
  const t = e.target;
  const href = t.getAttribute("href");
  if(!href) return;
  linkWidgetOldStatusbarText = linkWidgetStatusbar.getAttribute("label");
  linkWidgetStatusbar.setAttribute("label", href);
}

function linkWidgetMouseExit(e) {
  const t = e.target;
  const href = t.getAttribute("href");
  const txt = linkWidgetStatusbar.getAttribute("label");
  if(txt==href) linkWidgetStatusbar.setAttribute("label", linkWidgetOldStatusbarText);
  linkWidgetOldStatusbarText = null;
}


function linkWidgetFillTooltip(tooltip, event) {
  const elt = document.tooltipNode, line1 = tooltip.firstChild, line2 = tooltip.lastChild;
  const text1 = elt.getAttribute("tooltiptext1") || elt.getAttribute("tooltiptext0");
  const text2 = elt.getAttribute("href");
  line1.hidden = !(line1.value = text1);
  line2.hidden = !(line2.value = text2);
  // don't show the tooltip if it's over a submenu of the More menu
  return !(!text1 && !text2); // return a bool, not a string
}

function linkWidgetItemClicked(e) {
  if(e.button != 1) return;
  linkWidgetLoadPage(e);
  // close any menus
  var p = e.target;
  while(p.localName!="toolbarbutton") {
    if(p.localName=="menupopup") p.hidePopup();
    p = p.parentNode;
  }
}

function linkWidgetButtonRightClicked(e) {
  const t = e.target, ot = e.originalTarget;
  if(ot.localName=="toolbarbutton" && t.numLinks > 1) t.firstChild.showPopup();
}

function linkWidgetLoadPage(e) {
  const url = e.target.getAttribute("href");
  const sourceURL = content.document.documentURI;
  const button = e.type=="command" ? 0 : e.button;
  // Make handleLinkClick find the right origin URL
  const fakeEvent = { target: { ownerDocument: { location : { href: sourceURL }}},
      button: button, __proto__: e }; // proto must be set last
  // handleLinkClick deals with modified left-clicks, and middle-clicks
  const didHandleClick = handleLinkClick(fakeEvent, url, null);
  if(didHandleClick || button != 0) return;
  linkWidgetLoadPageInCurrentBrowser(url, sourceURL);
}

// only works for linkType=top/up/first/prev/next/last (i.e. only for buttons)
// used for keyboard shortcut handling
function linkWidgetGo(rel) {
  if(!linkWidgetButtons[rel]) return;
  const item = linkWidgetButtons[rel];
  if(!item || !item.numLinks) return;
  const url = item.getAttribute("href");
  const sourceURL = content.document.documentURI;
  linkWidgetLoadPageInCurrentBrowser(url, sourceURL);
}

function linkWidgetLoadPageInCurrentBrowser(url, sourceURL) {
  urlSecurityCheck(url, sourceURL);
  gBrowser.loadURI(url);
  content.focus();
}





function LinkWidgetLink(url, title, lang, media) {
  this.url = url;
  this.title = title || null;
  this.lang = lang || null;
  this.media = media || null;
}
LinkWidgetLink.prototype = {
  _longTitle: null,

  // this is only needed when showing a tooltip, or for items on the More menu, so we
  // often won't use it at all, hence using a getter function
  get longTitle() {
    if(!this._longTitle) {
      var longTitle = "";
      // XXX: lookup more meaningful and localized version of media,
      //   i.e. media="print" becomes "Printable" or some such
      // XXX: use localized version of ":" separator
      if(this.media && !/\b(all|screen)\b/i.test(this.media)) longTitle += this.media + ": ";
      // XXX this produces stupid results if there is an hreflang present but no title
      // (gives "French: ", should be something like "French [language] version")
      if(this.lang) longTitle += linkWidgetGetLanguageName(this.lang) + ": ";
      if(this.title) longTitle += this.title;
      // the 'if' here is to ensure the long title isn't just the url
      else if(longTitle) longTitle += this.url;
      this._longTitle = longTitle;
    }
    return this._longTitle;
  }
};



// Ignore whole links if their rel attribute matches this regexp.
// "meta" is for FOAF - see mozdev bug 10027 and/or http://rdfweb.org/topic/Autodiscovery
// "schema.foo" is used by Dublin Core and FOAF.
// "icon" turns up as "shortcut icon" too, I think.
// "stylesheet" is here because of "alternate stylesheet", which also needs ignoring
// pingback, fontdef and p3pv are inherited from Mozilla. XXX could they be moved to standardiseRelType?
const linkWidgetIgnoreRels =
  /\b(?:stylesheet\b|icon\b|pingback\b|fontdef\b|p3pv|schema\.|meta\b)/i;

// null values mean that rel should be ignored
const linkWidgetRelConversions = {
  home: "top",
  origin: "top",
  start: "top",
  parent: "up",
  begin: "first",
  child: "next",
  previous: "prev",
  end: "last",
  contents: "toc",
  nofollow: null, // blog thing
  external: null, // used to mean "off-site link", mostly used for styling
  prefetch: null,
  sidebar: null
};

const linkWidgetRevToRel = {
  made: "author",
  next: "prev",
  prev: "next",
  previous: "next"
};

function linkWidgetGetLinkRels(relStr, revStr, mimetype, title) {
  // Ignore certain links
  if(linkWidgetIgnoreRels.test(relStr)) return null;
  // Ignore anything Firefox regards as an RSS/Atom-feed link
  if(relStr && /alternate/i.test(relStr)) {
    const type = mimetype.replace(/\s|;.*/g, "").toLowerCase();
    const feedtype = /^application\/(?:rss|atom)\+xml$/;
    const xmltype = /^(?:application|text)\/(?:rdf\+)?xml$/;
    if(feedtype.test(type) || (xmltype.test(type) && /\brss\b/i.test(title))) return null;
  }

  const whitespace = /[ \t\f\r\n\u200B]+/; // per HTML4.01 spec
  const rels = {};
  var haveRels = false;
  if(relStr) {
    var relValues = relStr.split(whitespace);
    for(var i = 0; i != relValues.length; i++) {
      var rel = relValues[i].toLowerCase();
      // this has to use "in", because the entries can be null (meaning "ignore")
      rel = rel in linkWidgetRelConversions ? linkWidgetRelConversions[rel] : rel;
      if(rel) rels[rel] = true, haveRels = true;
    }
  }
  if(revStr) {
    var revValues = revStr.split(whitespace);
    for(i = 0; i < revValues.length; i++) {
      rel = linkWidgetRevToRel[revValues[i].toLowerCase()] || null;
      if(rel) rels[rel] = true, haveRels = true;
    }
  }
  return haveRels ? rels : null;
}

// a map from 2/3-letter lang codes to the langs' names in the current locale
var linkWidgetLangaugeNames = null;

// code is a language code, e.g. en, en-GB, es, fr-FR
function linkWidgetGetLanguageName(code) {
    if(!linkWidgetLangaugeNames) linkWidgetLangaugeNames =
      linkWidgetLoadStringBundle("chrome://global/locale/languageNames.properties");
    const dict = linkWidgetLangaugeNames;
    if(code in dict) return dict[code];
    // if we have something like "en-GB", change to "English (GB)"
    var parts = code.match(/^(.{2,3})-(.*)$/);
    // xxx make the parentheses localizable
    if(parts && parts[1] in dict) return dict[parts[1]]+" ("+parts[2]+")";
    return code;
}

// arg is an nsIDOMLocation, with protocol of http(s) or ftp
function linkWidgetGuessUp(location) {
    const ignoreRE = /(?:index|main)\.[\w.]+?$/i;
    const prefix = location.protocol + "//";
    var host = location.host, path = location.pathname, path0 = path, matches, tail;
    if(location.search && location.search!="?") return prefix + host + path;
    if(path[path.length - 1] == "/") path = path.slice(0, path.length - 1);
    // dig through path
    while(path) {
      matches = path.match(/^(.*)\/([^\/]*)$/);
      if(!matches) break;
      path = matches[1];
      tail = matches[2];
      if(path ? !ignoreRE.test(tail) : path0 != "/" && !ignoreRE.test(path0))
        return prefix + location.host + path + "/";
    }
    // dig through subdomains
    matches = host.match(/[^.]*\.(.*)/);
    return matches && /\./.test(matches[1]) ? prefix + matches[1] + "/" : null;
}

function linkWidgetLoadStringBundle(bundlePath) {
  const strings = {};
  try {
    var bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                 .getService(Components.interfaces.nsIStringBundleService)
                 .createBundle(bundlePath)
                 .getSimpleEnumeration();
  } catch(ex) {
    return {};  // callers can all survive without
  }

  while(bundle.hasMoreElements()) {
    var item = bundle.getNext().QueryInterface(Components.interfaces.nsIPropertyElement);
    strings[item.key] = item.value;
  }

  return strings;
}

function linkWidgetGuessPrevNextLinksFromURL(doc, guessPrev, guessNext) {
    if(!guessPrev && !guessNext) return;

    function isDigit(c) { return ("0" <= c && c <= "9") }

    const location = doc.location;
    var url = location.href;
    var min = location.host.length + location.protocol.length + 2; // 2 for "//"

    var e, s;
    for(e = url.length; e > min && !isDigit(url[e-1]); --e);
    if(e==min) return;
    for(s = e - 1; s > min && isDigit(url[s-1]); --s);

    var old = url.substring(s,e);
    var num = parseInt(old, 10); // force base 10 because number could start with zeros

    var pre = url.substring(0,s), post = url.substring(e);
    if(guessPrev) {
      var prv = ""+(num-1);
      while(prv.length < old.length) prv = "0" + prv;
      linkWidgetAddLinkForPage(pre + prv + post, null, null, null, doc, { prev: true });
    }
    if(guessNext) {
      var nxt = ""+(num+1);
      while(nxt.length < old.length) nxt = "0" + nxt;
      linkWidgetAddLinkForPage(pre + nxt + post, null, null, null, doc, { next: true });
    }
}

function linkWidgetScanPageForLinks(doc) {
  const links = doc.links;
  // The scanning blocks the UI, so we don't want to spend too long on it. Previously we'd block the
  // UI for several seconds on http://antwrp.gsfc.nasa.gov/apod/archivepix.html (>3000 links)
  const max = Math.min(links.length, 500);

  for(var i = 0; i != max; ++i) {
    var link = links[i], href = link.href;
    if(!href || href.charAt(0)=='#') continue; // ignore internal links

    var txt = link.innerHTML
        .replace(/<[^>]+alt="([^"]*)"[^>]*>/ig, " $1 ") // keep alt attrs
        .replace(/<[^>]+alt='([^']*)'[^>]*>/ig, " $1 ")
        .replace(/<[^>]*>/g, "") // drop tags + comments
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace(/\s+/g, " ")
        .replace(/^\s+|\s+$/g, "");
    var rels = (link.rel || link.rev) && linkWidgetGetLinkRels(link.rel, link.rev);
    if(!rels) {
      var rel = linkWidgetGuessLinkRel(link, txt);
      if(rel) rels = {}, rels[rel] = true;
    }
    if(rels) linkWidgetAddLinkForPage(href, txt, link.hreflang, null, doc, rels);
  }
}

const linkWidgetLinkTextPatterns = {
  // XXX some pages use << for first and < for prev, so we should handle things like that differently
  first: /^first\b|\bfirst$|^begin|\|<|\u00ab/i, // ? >\u007c| ?
  prev: /^prev(?:ious)?\b|prev$|previous$|^back\b|\bback$|^<<?-?\s?$|\u00ab/i, // \u003c / = | <=
  next: /^next\b|\bcontinue\b|next$|^\s?-?>?>$/i, // |\u00bb$/i,
  last: /^last\b|\blast$|^end\b|>\|/i, // ? >\u007c| ?
};

// regexps for identifying links based on the src url of contained images
const linkWidgetImgSrcPatterns = {
  first: /first/i,
  prev: /rev(?!iew)/i, // match [p]revious, but not [p]review
  next: /ne?xt|fwd|forward/i,
  last: /last/i,
};

// link is an <a href> link
function linkWidgetGuessLinkRel(link, txt) {
  if(linkWidgetLinkTextPatterns.next.test(txt)) return "next";
  if(linkWidgetLinkTextPatterns.prev.test(txt)) return "prev";
  if(linkWidgetLinkTextPatterns.first.test(txt)) return "first";
  if(linkWidgetLinkTextPatterns.last.test(txt)) return "last";
  
  const imgs = link.getElementsByTagName("img"), num = imgs.length;
  for(var i = 0; i != num; ++i) {
    // guessing is more accurate on relative URLs, and .src is always absolute
    var src = imgs[i].getAttribute("src");
    if(linkWidgetImgSrcPatterns.next.test(src)) return "next";
    if(linkWidgetImgSrcPatterns.prev.test(src)) return "prev";
    if(linkWidgetImgSrcPatterns.first.test(src)) return "first";
    if(linkWidgetImgSrcPatterns.last.test(src)) return "last";
  }  
  return null;
}


// xxx some of this should be moved to linkWidgetButton now
const linkWidgetItemBase = {
  popup: null,

  show: function() {
    throw "show() not implemented for some Link Widget item";
  },

  destroy: function() {},

  buildMenu: function() {
    const p = this.popup;
    while(p.hasChildNodes()) p.removeChild(p.lastChild);
    // this code won't be running unless the doc has links for this rel
    const links = content.document.linkWidgetLinks[this.rel], num = links.length;
    for(var i = 0; i != num; i++) {
      var l = links[i];
      var href = l.url, label = l.longTitle || l.url, tooltip = l.title;
      var mi = document.createElement("menuitem");
      mi.className = "menuitem-iconic";
      mi.setAttribute("href", href);
      mi.setAttribute("label", label);
      mi.setAttribute("tooltiptext1", tooltip);
      p.appendChild(mi);
    }
  }
};


// Top, Up, First, Prev, Next, and Last menu-buttons
// Hackery employed to disable the dropmarker if there is just one link.
function initLinkWidgetButton(elt, rel) {
  if(elt.alreadyInitialised) return elt;
  elt.alreadyInitialised = true;
  elt.rel = rel;
  // to avoid repetetive XUL
  elt.onmouseover = linkWidgetMouseEnter;
  elt.onmouseout = linkWidgetMouseExit;
  elt.onclick = linkWidgetItemClicked;
  elt.oncontextmenu = linkWidgetButtonRightClicked;
  elt.setAttribute("oncommand", "linkWidgetLoadPage(event);"); // .oncommand does not exist
  elt.setAttribute("context", "");
  elt.setAttribute("tooltip", "linkwidget-tooltip");
  elt.addEventListener("DOMMouseScroll", linkWidgetMouseScrollHandler, false);
  for(var i in linkWidgetButton) elt[i] = linkWidgetButton[i];
  var popup = elt.popup = document.createElement("menupopup");
  elt.appendChild(popup);
  popup.setAttribute("onpopupshowing", "return this.parentNode.buildMenu();");
  // hackish
  var anonKids = document.getAnonymousNodes(elt);
  elt.dropMarker = anonKids[anonKids.length-1];
  return elt;
};

const linkWidgetButton = {
  __proto__: linkWidgetItemBase,
  numLinks: 0,

  show: function(links) {
    const numLinks = this.numLinks = links ? links.length : 0
    this.disabled = !numLinks;
    if(!numLinks) {
      this.removeAttribute("href");
      this.removeAttribute("tooltiptext1");
      this.removeAttribute("multi");
      return;
    }
    const link = links[0];
    // xxx this sets these attributes every time a link is added to the current doc
    this.setAttribute("href", link.url);
    this.setAttribute("tooltiptext1", link.longTitle);
    if(numLinks == 1) {
      // just setting .disabled will not do anything, presumably because the
      // dropmarker xbl:inherits the toolbarbutton's disabled attribute.
      this.dropMarker.setAttribute("disabled","true");
    } else {
      this.dropMarker.removeAttribute("disabled");
      this.setAttribute("multi", "true");
    }
  }
};


// switches automatically between being a single menu item and a whole sub menu
function LinkWidgetItem(rel, relNum) {
  this.rel = rel;
  this.relNum = relNum
}
LinkWidgetItem.prototype = {
  __proto__: linkWidgetItemBase,

  menuitem: null,
  menu: null,
  popup: null,

  destroy: function() {
    const i = this.menuitem, m = this.menu, p = this.popup;
    if(!i) return;
    delete i.linkWidgetItem; i.parentNode.removeChild(i);
    delete m.linkWidgetItem; m.parentNode.removeChild(m);
    delete p.linkWidgetItem;
    this.menuitem = this.menu = this.popup = null;
  },

  show: function(links) {
    const numLinks = links ? links.length : 0;
    
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
    const relStr = linkWidgetStrings[rel] || rel;
    mi.className = "menuitem-iconic";
    mi.setAttribute("label", relStr);
    const m = this.menu = document.createElement("menu");
    m.setAttribute("label", linkWidgetStrings["2"+rel] || relStr);
    m.hidden = true;
    m.className = "menu-iconic";
    m.setAttribute("container", "true");
    const p = this.popup = document.createElement("menupopup");
    p.setAttribute("onpopupshowing", "this.linkWidgetItem.buildMenu();");

    mi.linkWidgetItem = m.linkWidgetItem = p.linkWidgetItem = this;
    mi.relNum = m.relNum = this.relNum;
    m.appendChild(p);
    
    const mpopup = linkWidgetMorePopup, kids = mpopup.childNodes, num = kids.length;
    var insertionpoint = null;
    if(this.relNum != Infinity && num != 0) {
      for(var i = 0, node = kids[i]; i < num && node.relNum < this.relNum; i += 2, node = kids[i]);
      if(i != num) insertionpoint = node;
    }
    if(insertionpoint) {
      mpopup.insertBefore(m, insertionpoint);
      mpopup.insertBefore(mi, insertionpoint);
    } else {
      mpopup.appendChild(m);
      mpopup.appendChild(mi);
    }
  }
};


// an item that's always a submenu (e.g. Chapters)
function LinkWidgetMenu(rel, relNum) {
  this.rel = rel;
  this.relNum = relNum;
}
LinkWidgetMenu.prototype = {
  __proto__: LinkWidgetItem.prototype,

  show: function(links) {
    const numLinks = links ? links.length : 0;
    if(!this.menuitem) {
      if(!numLinks) return;
      this.createElements();
      this.menuitem.hidden = true; // we never use it
    }
    this.menu.hidden = numLinks == 0;
  }
};
