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

/**
 * linkToolbarHandler is a Singleton that displays LINK elements
 * and nodeLists of LINK elements in the Link Toolbar.  It
 * associates the LINK with a corresponding LinkToolbarItem based
 * on it's REL attribute and the toolbar item's ID attribute.
 * linkToolbarHandler is also a Factory and will create
 * LinkToolbarItems as necessary.
 */
var linkToolbarHandler = {
  items: new Array(),
  hasItems: false,

  handleElement: function(linkElement) {
    var linkInfo = this.getLinkElementInfo(linkElement);
    if(!linkInfo) return null;
    
    this.handleLink(linkInfo);
    return linkInfo;
  },
  
  handleLink: function(linkInfo) {
    if(!this.hasItems) this.hasItems = true;
    
    for(var rel in linkInfo.relValues)
      this.getItemForLinkType(rel).displayLink(linkInfo);
  },

  getLinkHeaderInfo: function(headerStr) {
    // split the url off
    var matches = headerStr.match(/\s*<([^>\s]+)>(.*)/);
    if(!matches) return null;
    var url = matches[1];
    // XXX: check the url is valid (by creating an nsIURI maybe?)
    var params = matches[2];
    params = params.split(";");
    var parts = [];
    // avoid js strict warnings
    parts["title"] = ""; parts["rel"] = ""; parts["rev"] = ""; parts["hreflang"] = ""; parts["media"] = "";
    for(var i = 0; i < params.length; i++) {
      matches = params[i].match(/\s*([a-z0-9\-\.]*)="?([a-z0-9\-\.]*)"?\s*/i);
      if(matches) parts[matches[1]] = matches[2];
    }
    if(parts["rel"]=="" && parts["rev"]=="") return null;
    return this.getLinkInfo(url, parts["rel"], parts["rev"], parts["title"], parts["lang"], parts["media"]);
  },

  getLinkElementInfo: function(elt) {
    return this.getLinkInfo(elt.href, elt.rel, elt.rev, elt.title, elt.hreflang, elt.media);
  },
  
  getLinkInfo: function(url, relStr, revStr, title, hreflang, media) {
    // Ignore certain rel values for links
    // XXX: should some of these possibilites just be handled by returning null in standardiseRelType
    // as we do for prefetch?  that would mean the link would still handled if it had other rel
    // values that were interesting.  (icon and stylesheet we want to keep doing this way)
    if(/\b(stylesheet\b|icon\b|pingback\b|fontdef\b|p3pv|schema\.)/i.test(relStr)) return null;

    var relValues = [], rel, i;
    // get relValues from rel
    if(relStr) {
      var rawRelValues = relStr.split(/\s+/);
      for(i = 0; i < rawRelValues.length; i++) {
        rel = this.standardiseRelType(rawRelValues[i]);
        // avoid duplicate rel values
        if(rel) relValues[rel] = rel;
      }
    }
    // get relValues from rev
    if(revStr) {
      var revValues = revStr.split(/\s+/);
      for(i = 0; i < revValues.length; i++) {
        rel = this.convertRevToRel(revValues[i]);
        if(rel) relValues[rel] = rel;
      }
    }

    var prefix = "";
    // XXX: lookup more meaningful and localized version of media,
    //   i.e. media="print" becomes "Printable" or some such
    // XXX: use localized version of ":" separator
    if(media && !/\b(all|screen)\b/i.test(media))
      prefix += media + ": ";
    if(hreflang)
      prefix += ltLanguageDictionary.lookupLanguageName(hreflang) + ": ";
    var longTitle = prefix;
    if(title && title!="") longTitle += title;
    else longTitle += url;

    // bundle everything into an object to be passed to a LinkToolbarItem (or a subclass)
    return {
      relValues: relValues,
      longTitle: longTitle,
      href:  url,
      title: title
    }
  },

  standardiseRelType: function(relValue) {
    switch (relValue.toLowerCase()) {
      case "top":
      case "origin":
        return "top";
      case "up":
      case "parent":
        return "up";
      case "start":
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
      case "author":
        return "author";
      case "contents":
      case "toc":
        return "toc";
      case "prefetch":
      case "sidebar":
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
      default:
        // returning the revValue is not an option, because the
        // toolbar is based on rel types, not rev types
        return null;
    }
  },


  getItemForLinkType: function(linkType) {
    if(!(linkType in this.items && this.items[linkType]))
      this.items[linkType] = this.createItemForLinkType(linkType);
    return this.items[linkType];
  },

  createItemForLinkType: function(linkType) {
    var linkTypeElement = document.getElementById("link-" + linkType);
    if(!linkTypeElement) return new LinkToolbarTransientItem(linkType);
    switch(linkTypeElement.localName) {
      case "toolbarbutton":
        return new LinkToolbarButton(linkType,linkTypeElement);
      case "menuitem":
        return new LinkToolbarItem(linkType,linkTypeElement);
      case "menu":
        return new LinkToolbarMenu(linkType,linkTypeElement);
      default:
        // should never reach this
        throw ("Link Toolbar Error: unrecognised element exists for rel="+linkType);
    }
  },

  clearAllItems: function() {
    if(!this.hasItems) return;
    // disable the individual items
    for(var linkType in this.items) this.items[linkType].clear();
    // remember that the toolbar is empty
    this.hasItems = false;
  }
}





/* ltLanguageDictionary is a Singleton for looking up a language name
 * given its language code.
 */
const ltLanguageDictionary = {
  dictionary: null,

  lookupLanguageName: function(languageCode) {
    if(!this.dictionary) this.createDictionary();
    
    if(languageCode in this.dictionary)
      return this.dictionary[languageCode];

    // XXX: could we handle non-standard language codes better?
    // (this includes things like "en-GB".  we only handle 2 (or
    // occasionally 3) letter language codes at the moment)
    return languageCode;
  },

  // use xpcom to read the stringbundle with language codes into an array.
  // if it doesn't work then we don't throw errors, just the array will be empty
  // and the user will see the raw lang codes rather than the localised names.
  createDictionary: function() {
    this.dictionary = new Array();
    var e = null;
    try {
      var svc = Components.classes["@mozilla.org/intl/stringbundle;1"]
                          .getService(Components.interfaces.nsIStringBundleService);
      var bundle = svc.createBundle("chrome://global/locale/languageNames.properties");    
      e = bundle.getSimpleEnumeration();
    } catch(ex) {}
    if(!e) return;

    while(e.hasMoreElements()) {
      var property = e.getNext();
      property = property.QueryInterface(Components.interfaces.nsIPropertyElement);
      this.dictionary[property.key] = property.value;
    }
  }
}
