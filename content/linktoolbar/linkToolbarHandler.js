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
 * The Original Code is Eric Hodel's <drbrain@segment7.net> code.
 *
 * The Initial Developer of the Original Code is
 * Eric Hodel.
 * Portions created by the Initial Developer are Copyright (C) 2001
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *      Christopher Hoess <choess@force.stwing.upenn.edu>
 *      Tim Taylor <tim@tool-man.org>
 *      Stuart Ballard <sballard@netreach.net>
 *      Chris Neale <cdn@mozdev.org>  [Port to Px]
 *      Stephen Clavering <mozilla@clav.co.uk>
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
    // add some methods to all link elements if we haven't done so already.
    if(!linkElement.linkToolbarExtensionsAdded) this.extendLinkElements(linkElement);
    if(linkElement.isIgnored()) return;
    if(!this.hasItems) {
      this.hasItems = true;
      linkToolbarUI.activate();
    }
    var relValues = linkElement.getRelValues();
    for(var i = 0; i < relValues.length; i++) {
      var linkType = this.getLinkType(relValues[i]);
        this.getItemForLinkType(linkType).displayLink(linkElement);
    }
  },

  getLinkType: function(relAttribute) {
    switch (relAttribute.toLowerCase()) {
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
      case "made":
        return "author";
      case "contents":
      case "toc":
        return "toc";
      default:
        return relAttribute.toLowerCase();
    }
  },

  getItemForLinkType: function(linkType) {
    if(!(linkType in this.items && this.items[linkType]))
      this.items[linkType] = this.createItemForLinkType(linkType);

    return this.items[linkType];
  },

  createItemForLinkType: function(linkType) {
    if(!document.getElementById("link-" + linkType))
      return new LinkToolbarTransientMenu(linkType);
    // XXX: replace switch with polymorphism
    switch(document.getElementById("link-" + linkType).localName) {
      case "toolbarbutton":
        return new LinkToolbarButton(linkType);
      case "menuitem":
        return new LinkToolbarItem(linkType);
      case "menu":
        return new LinkToolbarMenu(linkType);
      default:
        return new LinkToolbarTransientMenu(linkType);
    }
  },

  clearAllItems: function() {
    // Hide the 'miscellaneous' separator
    document.getElementById("misc-separator").hidden = true;
    // Disable the individual items
    for(var linkType in this.items) this.items[linkType].clear();
    // Store the fact that the toolbar is empty
    this.hasItems = false;
  },

  /* This code replaces the old LinkElementDecorator.
   * The first time a <link> is handled this function is called, and adds some
   * functions that we need to the prototype for all <link>s
   */
  extendLinkElements: function(element) {
    var c = element.constructor;
    // set a flag so this is only executed once
    c.prototype.linkToolbarExtensionsAdded = true;
    c.prototype.getRelValues = function() {
      if(!this._relValues) {
        // convert rev=made to rel=made, which is handled the same as rel=author
        var rel = (!this.rel && this.rev && /\bmade\b/i.test(this.rev)) ? this.rev : this.rel;
        // XXX should this be changed to split round any whitespace ? probably yes
        if(rel) this._relValues = rel.split(" ");
        else this._relValues = null;
      }
      return this._relValues;
    };
    c.prototype.isIgnored = function() {
      // XXX should we cache the value that's returned? would cause problems if page changes rel= ?
      var relValues = this.getRelValues()
      if(!relValues) return true;
      for(var i = 0; i < relValues.length; i++)
        if(/^stylesheet$|^icon$|^pingback$|^fontdef$|^p3pv|^schema./i.test(relValues[i]))
          return true;
      return false;
    };
    c.prototype.getTooltip = function() {
      return this.getLongTitle() != "" ? this.getLongTitle() : this.href;
    };
    c.prototype.getLabel = function() {
      return this.getLongTitle() != "" ? this.getLongTitle() : this.rel;
    };
    c.prototype.getLongTitle = function() {
      if(!this.longTitle) {
        var prefix = "";
        // XXX: lookup more meaningful and localized version of media,
        //   i.e. media="print" becomes "Printable" or some such
        // XXX: use localized version of ":" separator
        if (this.media && !/\ball\b|\bscreen\b/i.test(this.media))
          prefix += this.media + ": ";
        if (this.hreflang)
          prefix += languageDictionary.lookupLanguageName(this.hreflang) + ": ";
        this.longTitle = this.title ? prefix + this.title : prefix;
      }
      return this.longTitle;
    };
  }
}




/*
XXX: This code was not in use before the removal of LinkElementDecorator,
and would now require a rewriting.

function AnchorElementDecorator(element) {
  this.constructor(element);
}
AnchorElementDecorator.prototype = new LinkElementDecorator;

AnchorElementDecorator.prototype.getLongTitle = function() {
  return this.title ? this.__proto__.getLongTitle.apply(this)
      : getText(this.element);
}

AnchorElementDecorator.prototype.getText = function(element) {
  return condenseWhitespace(getTextRecursive(element));
}

AnchorElementDecorator.prototype.getTextRecursive = function(node) {
  var text = "";
  node.normalize();
  if (node.hasChildNodes()) {
    for (var i = 0; i < node.childNodes.length; i++) {
      if (node.childNodes.item(i).nodeType == Node.TEXT_NODE)
        text += node.childNodes.item(i).nodeValue;
      else if (node.childNodes.item(i).nodeType == Node.ELEMENT_NODE)
        text += getTextRecursive(node.childNodes.item(i));
    }
  }
  return text;
}
*/

//AnchorElementDecorator.prototype.condenseWhitespace = function(text) {
//  return text.replace(/\W*$/, "").replace(/^\W*/, "").replace(/\W+/g, " ");
//}
