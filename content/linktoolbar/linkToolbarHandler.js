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
  this.href = this.url = url;
  this.title = title;
  this.lang = lang;
  this.media = media;
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
      if(this.lang) longTitle += ltLanguageDictionary.lookup(this.lang) + ": ";
      if(this.title) longTitle += this.title;
      // the 'if' here is to ensure the long title isn't just the url
      else if(longTitle) longTitle += this.url;
      this._longTitle = longTitle;
    }
    return this._longTitle;
  }
};



var linkToolbarUtils = {
  getLinkRels: function(relStr, revStr, mimetype, title) {
    // Ignore certain rel values for links
    // XXX: should some of these possibilites just be handled by returning null in standardiseRelType
    // as we do for prefetch?  that would mean the link would still be handled if it had other rel
    // values that were interesting.  (icon and stylesheet we want to keep doing this way)
    if(/\b(stylesheet\b|icon\b|pingback\b|fontdef\b|p3pv|schema\.)/i.test(relStr)) return null;

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
        rel = this.convertRevToRel(revValues[i]);
        if(rel) relValues[rel] = true, haveRels = true;
      }
    }

    return haveRels ? relValues : null;
  },

  // mimetype and title are optional
  standardiseRelType: function(relValue, mimetype, title) {
    switch (relValue.toLowerCase()) {
      case "top":
      case "origin":
      case "start":
        return "top";
      case "up":
      case "parent":
        return "up";
      case "begin":
      case "first":
        return "first";
      case "next":
      case "child":
        return "next";
      case "prev":
      case "previous":
        return "prev";
      case "end":
      case "last":
        return "last";
      case "alternate":
        // Ignore "Livemark" links (see browser.js#~580 livemarkOnLinkAdded(...))
        if((mimetype && (mimetype=="application/rss+xml" || mimetype=="application/atom+xml"
            || mimetype=="application/x.atom+xml")) || (title && (title.indexOf("RSS")!=-1
            || title.indexOf("Atom")!=-1 || title.indexOf("rss")!=-1)))
          return null;
        return "alternate";
      case "author":
        return "author";
      case "contents":
      case "toc":
        return "toc";
      case "section":
        return "section";
      case "subsection":
        return "subsection";
      case "chapter":
        return "chapter";
      case "prefetch":
      case "sidebar":
      case "nofollow":
        return null;
      default:
        // might as well preserve case
        return relValue;
    }
  },

  convertRevToRel: function(revValue) {
    switch(revValue.toLowerCase()) {
      case "made":
        return "author";
      case "next":
        return "prev";
      case "prev":
      case "previous":
        return "next";
    }
    return null;
  }
};



// a lazily-initialised dictionary for looking up readable names for 2/3-letter lang codes
// e.g. "en" -> "English", "de" -> "German" (or en->Englisch, de->Deutsch)
var ltLanguageDictionary = {
  // code is a language code, e.g. en, en-GB, es, fr-FR
  lookup: function(code) {
    var dict = this.dictionary;
    if(code in dict) return dict[code];

    // see if we have something like "en-GB", and if so change to "English (GB)"
    var parts = code.match(/^(.{2,3})-(.*)$/);
    // xxx make the parentheses localizable
    if(parts && parts[1] in dict) return dict[parts[1]]+" ("+parts[2]+")";

    return code;
  },

  get dictionary() {
    delete this.dictionary; // remove this getter function, so that we can replace with an array

    // convert the stringbundle into a js hashtable
    var dict = this.dictionary = [];
    try {
      var bundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
                   .getService(Components.interfaces.nsIStringBundleService)
                   .createBundle("chrome://global/locale/languageNames.properties")
                   .getSimpleEnumeration();
    } catch(ex) {
      return []; // we'll just live without pretty-printing
    }

    while(bundle.hasMoreElements()) {
      var item = bundle.getNext().QueryInterface(Components.interfaces.nsIPropertyElement);
      dict[item.key] = item.value;
    }

    return dict;
  }
};
