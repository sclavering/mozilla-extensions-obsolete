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

The Original Code is Eric Hodel's <drbrain@segment7.net> code.

The Initial Developer of the Original Code is Eric Hodel.

Portions created by the Initial Developer are Copyright (c) 2001
the Initial Developer. All Rights Reserved.

Contributor(s):
  Christopher Hoess <choess@force.stwing.upenn.edu>
  Tim Taylor <tim@tool-man.org>
  Henri Sivonen <henris@clinet.fi>
  Stuart Ballard <sballard@netreach.net>
  Chris Neale <cdn@mozdev.org> [Port to Px]
  Stephen Clavering <mozilla@clav.co.uk>

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

/* This file contains simplified bits of code from linkToolbarItem.js,
   linkToolbarUI.js, and linkToolbarHandler.js, all from the LinkToolbar
   extension, and from Mozilla Seamonkey before that
   */

const NavButtons = {
  // an array of our tb buttons.  needs manually initing
  items: [],

  linkAdded: function(event) {
    var element = event.originalTarget;
    if (element.ownerDocument != getBrowser().contentDocument
        || !element instanceof Components.interfaces.nsIDOMHTMLLinkElement
        || !element.href
        || !element.rel)
      return;
    // 'this' would refer to this function
    var linkType = NavButtons.getLinkType(element.rel);
    if(linkType && NavButtons.items[linkType]) NavButtons.items[linkType].displayLink(element);
  },

  getLinkType: function(relAttribute) {
    var rel = relAttribute.toLowerCase();
    if(/\bup\b|\bparent\b/.test(rel))
      return "up";
    if(/\bnext\b|\bchild\b/.test(rel))
      return "next";
    if(/\bprev(ious)?\b/.test(rel))
      return "prev";
    if(/\btop\b|\borigin\b/.test(rel))
      return "top";
    if(/\bbegin\b|\bfirst\b/.test(rel))
      return "first";
    if(/\blast\b|\bend\b/.test(rel))
      return "last";
    return null;
  },

  clear: function(event) {
    for(var linkType in NavButtons.items) NavButtons.items[linkType].clear();
  },

  tabSelected: function(event) {
    if(event.originalTarget.localName != "tabs") return;
    NavButtons.clear(event);
    NavButtons.fullSlowRefresh();
  },

  fullSlowRefresh: function() {
    var node = getBrowser().contentDocument.documentElement;
    if(!(node instanceof Components.interfaces.nsIDOMHTMLHtmlElement)) return;

    node = node.firstChild;

    while(node) {
      if(node instanceof Components.interfaces.nsIDOMHTMLHeadElement) {
        node = node.firstChild;
        while(node) {
          if(node instanceof Components.interfaces.nsIDOMHTMLLinkElement)
            this.linkAdded({originalTarget: node});
          node = node.nextSibling;
        }
      } else if(node instanceof Components.interfaces.nsIDOMElement) {
        // head is supposed to be the first element inside html.
        // Got something else instead. returning
        return;
      } else {
        // Got a comment node or something like that. Moving on.
        node = node.nextSibling;
      }
    }
  },

  // called whenever one of the buttons is clicked
  commanded: function(event) {
    var destURL = event.target.getAttribute("href");
    if(!destURL) return;

	  try {
	    // we need to do a security check because we're loading this url from chrome
      var ssm = Components.classes["@mozilla.org/scriptsecuritymanager;1"].getService()
  	  	                  .QueryInterface(Components.interfaces.nsIScriptSecurityManager);
    	ssm.checkLoadURIStr(window.content.location.href, destURL, 0);

      var openTabs = true, openTabsInBackground = true;
      try {
    	  openTabs = gPrefService.getBoolPref("browser.tabs.opentabfor.middleclick")
        openTabsInBackground = prefSvc.getBoolPref("browser.tabs.loadInBackground");
      } catch(e) {}

    	// handle middleclick/ctrl+click/shift+click (nearly) as for links in page
    	if(event.button==1 && openTabs || event.ctrlKey) {
        // This is a hack to invert the open-in-background behaviour for new tabs
        // It ensures that a click opens in foreground, shift+click in background
        var e = openTabsInBackground ? {shiftKey: !event.shiftKey} : event;
        openNewTabWith(destURL, null, e, false);
      } else if(event.button==1 || event.shiftKey) {
        openNewWindowWith(destURL, null, false);
    	} else {
      	var referrer = Components.classes["@mozilla.org/network/standard-url;1"]
      	                         .createInstance(Components.interfaces.nsIURI);
      	referrer.spec = window.content.location.href;
      	loadURI(destURL, referrer);
      }
    } catch(e) {
      dump("Error: it is not permitted to load this URI from a <link> element: " + e);
    }
  },

  init: function() {
    var contentArea = document.getElementById("appcontent");
    contentArea.addEventListener("select", NavButtons.tabSelected, false);
    contentArea.addEventListener("DOMLinkAdded", NavButtons.linkAdded, true);
    contentArea.addEventListener("unload", NavButtons.clear, true);
    // do we need these as well?  they were in activate()
    //contentArea.addEventListener("load", NavButtons.deactivate, true);
    // need to manually init the items array
    var linktypes = ["top","up","first","prev","next","last"];
    for(var i = 0; i < linktypes.length; i++) {
      // if button has not been added to the toolbar this will fail, which is OK
      var button = document.getElementById("navbutton-"+linktypes[i]);
      if(button) NavButtons.items[linktypes[i]] = new NavButton(linktypes[i],button);
    }
  }
}

window.addEventListener("load", NavButtons.init, false);

function NavButton(linkType,element) {
  this.linkType = linkType;
  this.xulElement = element;

  this.clear = function() {
    this.xulElement.setAttribute("disabled", "true");
    this.xulElement.removeAttribute("href");
    this.xulElement.removeAttribute("tooltiptext");
  }

  this.displayLink = function(linkElement) {
    // don't overwrite.
    // XXX generate a submenu
    if(this.xulElement.hasAttribute("href")) return false;
    //
    this.xulElement.setAttribute("href", linkElement.href);
    this.xulElement.removeAttribute("disabled");
    this.xulElement.removeAttribute("hidden");
    // XXX use a multiline tooltip
    if(linkElement.title != '')
      this.xulElement.setAttribute("tooltiptext", linkElement.title + ' [' + linkElement.href + ']');
    else
      this.xulElement.setAttribute("tooltiptext", linkElement.href);
    return true;
  }
}

