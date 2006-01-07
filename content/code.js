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


var gLinkWidget = null;
var gLinkWidgetPrefUseLinkGuessing = false;
var gLinkWidgetPrefGuessUpAndTopFromURL = false;
var gLinkWidgetPrefGuessPrevAndNextFromURL = false;
var gLinkWidgetPrefScanHyperlinks = false;
var linkWidgetStrings = "chrome://linkwidget/locale/main.strings";

var gLinkWidgetStatusbar = null; // Firefox's usual statusbar

function linkWidgetStartup() {
  window.removeEventListener("load", linkWidgetStartup, false);
  gLinkWidgetStatusbar = document.getElementById("statusbar-display");
  linkWidgetStrings = linkWidgetLoadStringBundle(linkWidgetStrings);
  linkWidgetItems.init();

  setTimeout(linkWidgetDelayedStartup, 1); // needs to happen after Fx's delayedStartup()

  // pref listener (sort of)
  var os = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  os.addObserver(linkWidgetPrefObserver, "linkwidget:prefs-updated", false);
}

function linkWidgetDelayedStartup() {
  linkWidgetLoadPrefs();
  linkWidgetAddHandlers();
  // replace the toolbar customisation callback
  var box = document.getElementById("navigator-toolbox");
  box._preLinkWidget_customizeDone = box.customizeDone;
  box.customizeDone = linkWidgetToolboxCustomizeDone;
}

function linkWidgetShutdown() {
  window.removeEventListener("unload", linkWidgetShutdown, false);
  // unhook pref listener (to prevent memory leaks)
  var os = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  os.removeObserver(linkWidgetPrefObserver, "linkwidget:prefs-updated", false);
}

window.addEventListener("load", linkWidgetStartup, false);
window.addEventListener("unload", linkWidgetShutdown, false);


function linkWidgetToolboxCustomizeDone(somethingChanged) {
  if(somethingChanged) {
    linkWidgetItems.updateForToolbarCustomisation();
    linkWidgetRefreshLinks();
  }
  this._preLinkWidget_customizeDone(somethingChanged);
}


function linkWidgetLoadPrefs() {
  var branch = gPrefService.getBranch("extensions.linkwidget.");

  gLinkWidgetPrefScanHyperlinks = branch.getBoolPref("scanHyperlinks");
  gLinkWidgetPrefGuessUpAndTopFromURL = branch.getBoolPref("guessUpAndTopFromURL");
  gLinkWidgetPrefGuessPrevAndNextFromURL = branch.getBoolPref("guessPrevAndNextFromURL");

  gLinkWidgetPrefUseLinkGuessing = gLinkWidgetPrefScanHyperlinks
      || gLinkWidgetPrefGuessUpAndTopFromURL || gLinkWidgetPrefGuessPrevAndNextFromURL;
}


var linkWidgetPrefObserver = {
  observe: function(subject, topic, data) {
    linkWidgetLoadPrefs();
  }
};


function linkWidgetAddHandlers() {
  var browser = gBrowser;
  browser.addEventListener("select", linkWidgetTabSelectedHandler, false);
  browser.addEventListener("DOMLinkAdded", linkWidgetLinkAddedHandler, true);
  browser.addEventListener("unload", linkWidgetPageClosedHandler, true);
  browser.addEventListener("pagehide", linkWidgetPageClosedHandler, false);
  browser.addEventListener("DOMContentLoaded", linkWidgetPageLoadedHandler, true);
  browser.addEventListener("pageshow", linkWidgetPageShowHandler, false);
}


function linkWidgetRemoveHandlers() {
  var browser = gBrowser;
  browser.removeEventListener("select", linkWidgetTabSelectedHandler, false);
  browser.removeEventListener("DOMLinkAdded", linkWidgetLinkAddedHandler, true);
  browser.removeEventListener("unload", linkWidgetPageClosedHandler, true);
  browser.removeEventListener("pagehide", linkWidgetPageClosedHandler, true);
  browser.removeEventListener("DOMContentLoaded", linkWidgetPageLoadedHandler, true);
  browser.removeEventListener("pageshow", linkWidgetPageShowHandler, false);
}


// Used to make the page scroll when the mouse-wheel is used on one of our buttons
function linkWidgetMouseScrollHandler(event) {
  content.scrollBy(0, event.detail);
}


function linkWidgetLinkAddedHandler(event) {
  var elt = event.originalTarget;
  var doc = elt.ownerDocument;
  if(!(elt instanceof HTMLLinkElement) || !elt.href || !(elt.rel || elt.rev)) return;
  var rels = linkWidgetUtils.getLinkRels(elt.rel, elt.rev, elt.type, elt.title);
  if(!rels) return;
  var linkInfo = new LTLinkInfo(elt.href, elt.title, elt.hreflang, elt.media);
  linkWidgetAddLinkForPage(linkInfo, doc, rels);
}


// Really ought to delete/nullify doc.__lt__links on "close" (but not on "pagehide")
function linkWidgetPageClosedHandler(event) {
  // Links like: <a href="..." onclick="this.style.display='none'">.....</a>
  // (the onclick handler could instead be on an ancestor of the link) lead to unload/pagehide
  // events with originalTarget==a text node.  So use ownerDocument (which is null for Documents)
  var doc = event.originalTarget;
  if(!(doc instanceof Document)) doc = doc.ownerDocument;
  // don't clear the links for unload/pagehide from a background tab, or from a subframe
  if(doc != gBrowser.contentDocument) return;
  linkWidgetItems.clearAll();
}


function linkWidgetPageLoadedHandler(event) {
  var doc = event.originalTarget;
  if(!gLinkWidgetPrefUseLinkGuessing) return;
  if(!(doc instanceof HTMLDocument)) return;
  const win = doc.defaultView;
  if(win != win.top) return;

  if(doc._linkWidget_haveGuessedLinks) return;
  doc._linkWidget_haveGuessedLinks = true;

  const links = doc.__lt__links || (doc.__lt__links = []);

  if(gLinkWidgetPrefScanHyperlinks)
    linkWidgetLinkFinder.scanPageLinks(doc, links);

  const protocol = doc.location.protocol;
  if(!/^(?:https|http|ftp)\:$/.test(protocol)) return;

  if(gLinkWidgetPrefGuessUpAndTopFromURL) {
    if(!links.up) {
      var upUrl = linkWidgetUtils.guessUpUrl(doc.location);
      if(upUrl) linkWidgetAddLinkForPage(new LTLinkInfo(upUrl), doc, {up: true});
    }
    if(!links.top) {
      var topUrl = linkWidgetUtils.guessTopUrl(doc.location);
      if(topUrl) linkWidgetAddLinkForPage(new LTLinkInfo(topUrl), doc, {top: true});
    }
  }
  if(gLinkWidgetPrefGuessPrevAndNextFromURL)
    linkWidgetLinkFinder.guessPrevAndNextFromURL(doc, !links.prev, !links.next);
}


function linkWidgetTabSelectedHandler(event) {
  if(event.originalTarget.localName != "tabs") return;
  linkWidgetRefreshLinks();
}


function linkWidgetPageShowHandler(event) {
  const doc = event.originalTarget;
  if(doc == gBrowser.contentDocument) linkWidgetRefreshLinks();
}


function linkWidgetRefreshLinks() {
  linkWidgetItems.clearAll();
  var doc = content.document;
  if(!doc.__lt__links) return;
  linkWidgetItems.handleLinksForRels(doc.__lt__links);
}


function linkWidgetAddLinkForPage(linkInfo, doc, rels) {
  // remember the link in an array on the document
  // xxx we'd prefer not to pollute the document's DOM of course, but javascript
  // doesn't have real hashtables (only string->anything maps), so there isn't
  // all that much choice.
  // xxx this doesn't work (at all) with XPCNativeWrappers as of 20050712
  var doclinks = doc.__lt__links || (doc.__lt__links = []);
  for(var r in rels) {
    if(!(r in doclinks)) doclinks[r] = [];
    // we leave any existing link with the same URL alone so that linkWidgetLinkFinder-generated
    // links don't replace page-provided ones (which are likely to have better descriptions)
    var url = linkInfo.url;
    if(url in doclinks[r]) delete rels[r];
    else doclinks[r][url] = linkInfo;
  }

  if(doc == content.document) linkWidgetItems.handleLinkForRels(linkInfo, rels);
}



// Code to show urls in the status bar (setting statustext attribute does zilch).
// Rather complex because it worries about restoring the old text, and only doing so if something else hasn't modified the text in the meantime.

var gLinkWidgetOldStatusbarText = null;

function linkWidgetMouseEnter(e) {
  const t = e.target;
  const href = t.getAttribute("href");
  if(!href) return;
  gLinkWidgetOldStatusbarText = gLinkWidgetStatusbar.getAttribute("label");
  gLinkWidgetStatusbar.setAttribute("label", href);
}

function linkWidgetMouseExit(e) {
  const t = e.target;
  const href = t.getAttribute("href");
  const txt = gLinkWidgetStatusbar.getAttribute("label");
  if(txt==href) gLinkWidgetStatusbar.setAttribute("label", gLinkWidgetOldStatusbarText);
  gLinkWidgetOldStatusbarText = null;
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
  if(ot.localName=="toolbarbutton" && t.links.length>1) t.firstChild.showPopup();
}

function linkWidgetLoadPage(e) {
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
  linkWidgetLoadPageInCurrentBrowser(url, sourceURL);
}

// only works for linkType=top/up/first/prev/next/last (i.e. only for buttons)
// used for keyboard shortcut handling
function linkWidgetGo(linkType) {
  const item = linkWidgetItems.getItem(linkType);
  if(!item || !item.links.length) return;
  const url = item.getAttribute("href");
  const sourceURL = content.document.documentURI; // item.ltSourceURL;
  linkWidgetLoadPageInCurrentBrowser(url, sourceURL);
}

function linkWidgetLoadPageInCurrentBrowser(url, sourceURL) {
  urlSecurityCheck(url, sourceURL);
  gBrowser.loadURI(url);
  content.focus();
}





function LTLinkInfo(url, title, lang, media) {
  this.url = url;
  this.title = title || null;
  this.lang = lang || null;
  this.media = media || null;
}
LTLinkInfo.prototype = {
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
      if(this.lang) longTitle += linkWidgetUtils.getLanguageName(this.lang) + ": ";
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

const linkWidgetUtils = {
  getLinkRels: function(relStr, revStr, mimetype, title) {
    // Ignore certain links
    if(linkWidgetIgnoreRels.test(relStr)) return null;

    const relValues = {};
    var rel, i, haveRels = false;
    // get relValues from rel
    if(relStr) {
      var rawRelValues = relStr.split(/[ \t\f\r\n\u200B]+/);
      for(i = 0; i < rawRelValues.length; i++) {
        rel = this.standardiseRelType(rawRelValues[i], mimetype, title);
        // avoid duplicate rel values
        if(rel) relValues[rel] = true, haveRels = true;
      }
    }
    // get relValues from rev
    if(revStr) {
      var revValues = revStr.split(/[ \t\f\r\n\u200B]+/);
      for(i = 0; i < revValues.length; i++) {
        rel = linkWidgetRevToRel[revValues[i].toLowerCase()] || null;
        if(rel) relValues[rel] = true, haveRels = true;
      }
    }

    return haveRels ? relValues : null;
  },

  // mimetype and title are optional
  standardiseRelType: function(relValue, mimetype, title) {
    const rel = relValue.toLowerCase();
    if(rel == "alternate") {
        // xxx this is out of sync with Fx
        // Ignore "Livemark" links (see browser.js#~580 livemarkOnLinkAdded(...))
        if((mimetype && (mimetype=="application/rss+xml" || mimetype=="application/atom+xml"
            || mimetype=="application/x.atom+xml")) || (title && (title.indexOf("RSS")!=-1
            || title.indexOf("Atom")!=-1 || title.indexOf("rss")!=-1)))
          return null;
        return "alternate";
    }
    return rel in linkWidgetRelConversions ? linkWidgetRelConversions[rel] : rel;
  },

  // code is a language code, e.g. en, en-GB, es, fr-FR
  getLanguageName: function(code) {
    const dict = this._languageDictionary;
    if(code in dict) return dict[code];
    // if we have something like "en-GB", change to "English (GB)"
    var parts = code.match(/^(.{2,3})-(.*)$/);
    // xxx make the parentheses localizable
    if(parts && parts[1] in dict) return dict[parts[1]]+" ("+parts[2]+")";
    return code;
  },

  // a lazily-initialised dictionary for looking up readable names for 2/3-letter lang codes
  // e.g. "en" -> "English", "de" -> "German" (or en->Englisch, de->Deutsch)
  get _languageDictionary() {
    delete this._languageDictionary; // remove this getter function, so that we can replace with an array
    return this._languageDictionary =
      linkWidgetLoadStringBundle("chrome://global/locale/languageNames.properties");
  },

  // arg is an nsIDOMLocation, with protocol of http(s) or ftp
  guessTopUrl: function(location) {
    return location.protocol + "//" + location.host + "/";
  },

  guessUpUrl: function(location) {
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
};


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




var linkWidgetLinkFinder = {
  // regular expressions for identifying link types
  // XXX some pages use << for first and < for prev, so we should handle things like that differently
  re_first: /^first\b|\bfirst$|^begin|\|<|\u00ab/i, // ? >\u007c| ?
  re_prev:  /^prev(?:ious)?\b|prev$|previous$|^back\b|\bback$|^<<?-?\s?$|\u00ab/i, // \u003c / = | <=
  re_next:  /^next\b|\bcontinue\b|next$|^\s?-?>?>$/i, // |\u00bb$/i,
  re_last:  /^last\b|\blast$|^end\b|>\|/i, // ? >\u007c| ?

  // regular expressions used for identifying links based on the src url of contained images
  img_re_first: /first/i,
  img_re_prev:  /rev(?!iew)/i, // match [p]revious, but not [p]review
  img_re_next:  /ne?xt|fwd|forward/i,
  img_re_last:  /last/i,

  guessPrevAndNextFromURL: function(doc, guessPrev, guessNext) {
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
      linkWidgetAddLinkForPage(new LTLinkInfo(pre + prv + post), doc, { prev: true });
    }
    if(guessNext) {
      var nxt = ""+(num+1);
      while(nxt.length < old.length) nxt = "0" + nxt;
      linkWidgetAddLinkForPage(new LTLinkInfo(pre + nxt + post), doc, { next: true });
    }
  },

  scanPageLinks: function(doc, links) {
    // The user has to wait for linkWidgetLinkFinder to finish before they can interact with the page
    // that has just loaded.  On pages with lots of links linkWidgetLinkFinder could make Firefox
    // unresponsive for several seconds if we didn't cap the number of links we inspect.
    // xxx think more about what cap to use (500 is probably excessively high)
    var max = Math.min(doc.links.length, 500);

    for(var i = 0; i != max; i++) {
      var link = doc.links[i];
      var href = link.href;

      // ignore internal links
      if(!href || href.charAt(0)=='#') continue;

      var rels = [];
      var title = this.getTextAndImgRels(link, rels);
      title = title.replace(/\s+/g," ");

      if(link.rel || link.rev) {
        rels = linkWidgetUtils.getLinkRels(link.rel, link.rev);
        var info = new LTLinkInfo(link.href, title, link.hreflang, null);
        linkWidgetAddLinkForPage(info, doc, rels);
        continue; // no point using the regexps
      }

      if(this.re_next.test(title)) rels.next = true;
      else if(this.re_prev.test(title)) rels.prev = true;
      else if(this.re_first.test(title)) rels.first = true;
      else if(this.re_last.test(title)) rels.last = true;

      linkWidgetAddLinkForPage(new LTLinkInfo(href, title), doc, rels);
    }
  },

  // get the text contained in a link, and any guesses for rel based on img url
  getTextAndImgRels: function(el, rels) {
    var s = "";
    var node = el, lastNode = el.nextSibling;
    while(node && node!=lastNode) {
      var t = null;
      if(node.nodeType==3 || node.nodeType==2) {
        t = node.nodeValue; // CDATA and Text nodes
      } else if(node instanceof HTMLImageElement) {
        t = node.alt;
        // guess rel values from the URL. .src always gives an absolute URL, so we use getAttribute
        var src = node.getAttribute("src");
        if(this.img_re_next.test(src)) rels.next = true;
        else if(this.img_re_prev.test(src)) rels.prev = true;
        else if(this.img_re_first.test(src)) rels.first = true;
        else if(this.img_re_last.test(src)) rels.last = true;
      } else if(node instanceof HTMLAreaElement) {
        t = node.alt;
      }

      if(t) s = s ? s+" "+t : t; // the space *is* important.  some sites (ebay) don't put a space btwn. text and images

      var next = node.firstChild || node.nextSibling;
      while(!next && node!=el) node = node.parentNode, next = node.nextSibling;
      node = next;
    }

    return s;
  }
}




// controller for all UI bits displaying <link>s
const linkWidgetItems = {
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
    this.moreMenu = document.getElementById("linkwidget-more-menu");
    this.morePopup = document.getElementById("linkwidget-more-popup");
  },

  _initButtons: function() {
    const btns = {top:true, up:true, first:true, prev:true, next:true, last:true};
    const buttons = this.buttons = {};
    for(var rel in btns) {
      var elt = document.getElementById("linkwidget-"+rel);
      if(elt) buttons[rel] = initLinkWidgetButton(elt, rel);
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
      if(item instanceof LinkWidgetItem) enableMoreMenu = true;
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
      if(item instanceof LinkWidgetItem) enableMoreMenu = true;
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
    for(var i = 0; i != num; ++i) kids[i].linkWidgetItem._isShowing = false;
  },

  getItem: function(rel) {
    const item = this.buttons[rel] || this.items[rel];
    if(item) return item;
    if(!this.moreMenu) return null;
    const relNum = this._itemPlacement[rel] || Infinity;
    const isMenu = rel in this._itemsWhichShouldAlwaysBeMenus;
    return this.items[rel] =
      isMenu ? new LinkWidgetMenu(rel, relNum) : new LinkWidgetItem(rel, relNum);
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


const linkWidgetItemBase = {
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
    throw "show() not implemented for some Link Widget item";
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
  elt.links = []; // each button needs its own array, not a reference to a shared one
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
  _isShowing: true,

  show: function() {
    this._linksHaveChanged = false;
    const links = this.links, numLinks = links.length;
    this.disabled = !numLinks;
    if(!numLinks) {
      this.removeAttribute("href");
      this.removeAttribute("tooltiptext1");
      this.removeAttribute("multi");
      return;
    }
    const link = links[0];
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
  this.links = [];
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
    const where = linkWidgetItems.getInsertionPointFor(this.relNum);
    const morePopup = linkWidgetItems.morePopup;
    if(where) {
      morePopup.insertBefore(m, where);
      morePopup.insertBefore(mi, where);
    } else {
      morePopup.appendChild(m);
      morePopup.appendChild(mi);
    }
  }
};


// an item that's always a submenu (e.g. Chapters)
function LinkWidgetMenu(rel, relNum) {
  this.links = [];
  this.rel = rel;
  this.relNum = relNum;
}
LinkWidgetMenu.prototype = {
  __proto__: LinkWidgetItem.prototype,

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
