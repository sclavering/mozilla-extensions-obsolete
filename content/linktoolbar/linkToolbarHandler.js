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
const linkToolbarHandler = {
  items: new Array(),
  hasItems: false,

  handle: function(linkElement) {
    if(this.isLinkIgnored(linkElement.rel)) return;
    if(!this.hasItems) {
      this.hasItems = true;
      linkToolbarUI.activate();
    }
    var linkInfo = this.getLinkElementInfo(linkElement);
    for(var rel in linkInfo.relValues)
      this.getItemForLinkType(rel).displayLink(linkInfo);
  },

  isLinkIgnored: function(relAttribute) {
    // XXX: from reading the bug where the DOMLinkAdded event was implemented, it appears
    // the event is *not fired* for stylesheet links, so the stylesheet part of this regex
    // may be unnecessary.
    // XXX: should some of these possibilites just be handled by returning null in standardiseRelType
    // as we do for prefetch?  that would mean the link would still handled if it had other rel
    // values that were interesting
    return /\b(stylesheet\b|icon\b|pingback\b|fontdef\b|p3pv|schema\.)/i.test(relAttribute);
  },

  // find all the info we need to show a link on the link toolbar
  getLinkElementInfo: function(element) {
    var relValues = [], rel, i;
    // get relValues from rel attribute
    if(element.rel) {
      var rawRelValues = element.rel.split(/\s+/);
      for(i = 0; i < rawRelValues.length; i++) {
        rel = this.standardiseRelType(rawRelValues[i]);
        // avoid duplicate rel values
        if(rel) relValues[rel] = rel;
      }
    }
    // get relValues from rel attribute
    if(element.rev) {
      var revValues = element.rev.split(/\s+/);
      for(i = 0; i < revValues.length; i++) {
        rel = this.convertRevToRel(revValues[i]);
        if(rel) relValues[rel] = rel;
      }
    }

    var prefix = "";
    // XXX: lookup more meaningful and localized version of media,
    //   i.e. media="print" becomes "Printable" or some such
    // XXX: use localized version of ":" separator
    if(element.media && !/\b(all|screen)\b/i.test(element.media))
      prefix += element.media + ": ";
    if (element.hreflang)
      prefix += ltLanguageDictionary.lookupLanguageName(element.hreflang) + ": ";
    var longTitle = prefix;
    if(element.title&&element.title!="") longTitle += element.title;

    // bundle everything into an object to be passed to a LinkToolbarItem (or a subclass)
    return {
      linkElement: element,
      relValues: relValues,
      longTitle: longTitle,
      href:  element.href,
      title: element.title
    }
  },

  standardiseRelType: function(relValue) {
    switch (relValue.toLowerCase()) {
      case "start":
      case "top":
      case "origin":
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
      case "author":
        return "author";
      case "contents":
      case "toc":
        return "toc";
      case "prefetch":
      case "sidebar":
        return null;
      default:
        return relValue.toLowerCase();
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
    if(!linkTypeElement) {
      var menu = this.createNewMenuForLinkType(linkType);
      document.getElementById("more-menu-popup").appendChild(menu);
      return new LinkToolbarMenu(linkType,menu);
    }
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

  createNewMenuForLinkType: function(linkType) {
    var menu = document.createElement("menu");
    menu.id = "link-"+linkType;
    menu.setAttribute("label",linkType);
    menu.hidden = true;
    menu.className = "menu-iconic bookmark-item";
    menu.setAttribute("container", "true");
    // create the popup to go with it
    var popup = document.createElement("menupopup");
    popup.id = "link-"+linkType+"-popup";
    menu.appendChild(popup);
    return menu;
  },

  clearAllItems: function() {
    // Disable the individual items
    for(var linkType in this.items) this.items[linkType].clear();
    // remember that the toolbar is empty
    this.hasItems = false;
  }
}




/*
 * ltLanguageDictionary is a Singleton for looking up a language name
 * given its language code.
 *
 * was languageDictionary.js
 *
 * XXX: if we just put a <stringbundle> in the overlay file we could
 * avoid this mess
 */
const ltLanguageDictionary = {
  dictionary: null,

  // XXX: could we handle non-standard language codes better?
  lookupLanguageName: function(languageCode) {
    if (this.getDictionary()[languageCode])
      return this.getDictionary()[languageCode];
    else
      return languageCode;
  },

  getDictionary: function() {
    if(!this.dictionary) {
      this.dictionary = new Array();
      var e = this.getLanguageNames().getSimpleEnumeration();
      while(e.hasMoreElements()) {
        var property = e.getNext();
        property = property.QueryInterface(Components.interfaces.nsIPropertyElement);
        this.dictionary[property.key] = property.value;
      }
    }
    return this.dictionary;
  },

  getLanguageNames: function() {
    // srGetStrBundle defined in /xpfe/global/resources/content/strres.js
    return srGetStrBundle("chrome://global/locale/languageNames.properties");
  }
}
