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
 *      Chris Neale <cdn@mozdev.org>  [Port to Px]
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
      if(this.lang) longTitle += linkToolbarUtils.getLanguageName(this.lang) + ": ";
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
const linkToolbarIgnoreRels =
  /\b(?:stylesheet\b|icon\b|pingback\b|fontdef\b|p3pv|schema\.|meta\b)/i;

const linkToolbarRelConversions = {
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

const linkToolbarRevToRel = {
  made: "author",
  next: "prev",
  prev: "next",
  previous: "next"
};

const linkToolbarUtils = {
  getLinkRels: function(relStr, revStr, mimetype, title) {
    // Ignore certain links
    if(linkToolbarIgnoreRels.test(relStr)) return null;

    var relValues = [], rel, i, haveRels = false;
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
        rel = linkToolbarRevToRel[revValues[i].toLowerCase()] || null;
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
    return rel in linkToolbarRelConversions ? linkToolbarRelConversions[rel] : rel;
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
      linkToolbarLoadStringBundle("chrome://global/locale/languageNames.properties");
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


function linkToolbarLoadStringBundle(bundlePath) {
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
