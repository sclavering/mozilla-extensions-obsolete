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
 *   Christopher Hoess <choess@force.stwing.upenn.edu>
 *   Tim Taylor <tim@tool-man.org>
 *   Henri Sivonen <henris@clinet.fi>
 *   Stuart Ballard <sballard@netreach.net>
 *   Chris Neale <cdn@mozdev.org> [Port to Px]
 *   Stephen Clavering <mozilla@clav.co.uk>
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


// formerly linkToolbarOverlay.js, but heavily reformatted

const linkToolbarUI = {
  linkAdded: function(event) {
    var element = event.originalTarget;
    if (element.ownerDocument != getBrowser().contentDocument
        || !linkToolbarUI.isLinkToolbarEnabled()
        || !element instanceof Components.interfaces.nsIDOMHTMLLinkElement
        || !element.href
        || !(element.rel || element.rev))
      return;
    linkToolbarHandler.handle(element);
  },

  isLinkToolbarEnabled: function() {
    try {
      if (document.getElementById("linktoolbar").getAttribute("hidden") == "true")
        return false;
      else
        return true;
    } catch(e) { return false }
  },

  clear: function(event) {
    if (event.originalTarget != getBrowser().contentDocument
        || !linkToolbarUI.isLinkToolbarEnabled()
        || !linkToolbarHandler.hasItems)
      return;
    linkToolbarHandler.clearAllItems();
  },

  tabSelected: function(event) {
    if (event.originalTarget.localName != "tabs"
        || !linkToolbarUI.isLinkToolbarEnabled())
      return;
    linkToolbarHandler.clearAllItems();
    linkToolbarUI.fullSlowRefresh();
  },

  fullSlowRefresh: function() {
    var currentNode = getBrowser().contentDocument.documentElement;
    if (!(currentNode instanceof Components.interfaces.nsIDOMHTMLHtmlElement))
      return;
    currentNode = currentNode.firstChild;

    while(currentNode) {
      if (currentNode instanceof Components.interfaces.nsIDOMHTMLHeadElement) {
        currentNode = currentNode.firstChild;
        while(currentNode) {
          if (currentNode instanceof Components.interfaces.nsIDOMHTMLLinkElement)
            linkToolbarUI.linkAdded({originalTarget: currentNode});
          currentNode = currentNode.nextSibling;
        }
      } else if (currentNode instanceof Components.interfaces.nsIDOMElement) {
        // head is supposed to be the first element inside html.
        // Got something else instead. returning
         return;
      } else {
        // Got a comment node or something like that. Moving on.
        currentNode = currentNode.nextSibling;
      }
    }
  },

  toolbarActive: false,

  activate: function() {
    if (!linkToolbarUI.toolbarActive) {
      linkToolbarUI.toolbarActive = true;
      document.getElementById("linktoolbar").setAttribute("hasitems", "true");
      var contentArea = document.getElementById("appcontent");
    //  var contentArea = document.getElementById("content");
      contentArea.addEventListener("unload", linkToolbarUI.clear, true);
      contentArea.addEventListener("load", linkToolbarUI.deactivate, true);
      contentArea.addEventListener("DOMHeadLoaded", linkToolbarUI.deactivate, true);
    }
  },

  deactivate: function() {
    // This function can never be called unless the toolbar is active, because
    // it's a handler that's only activated in that situation, so there's no need
    // to check toolbarActive. On the other hand, by the time this method is
    // called the toolbar might have been populated again already, in which case
    // we don't want to deactivate.
    if (!linkToolbarHandler.hasItems) {
      linkToolbarUI.toolbarActive = false;
      document.getElementById("linktoolbar").setAttribute("hasitems", "false");
      var contentArea = document.getElementById("appcontent");
      contentArea.removeEventListener("unload", linkToolbarUI.clear, true);
      contentArea.removeEventListener("load", linkToolbarUI.deactivate, true);
      contentArea.removeEventListener("DOMHeadLoaded", linkToolbarUI.deactivate, true);
    }
  },

  /* called whenever something on the toolbar gets an oncommand event */
  commanded: function(event) {
    // Return if this is one of the menubuttons.
    if (event.target.getAttribute("type") == "menu") return;
    if (!event.target.getAttribute("href")) return;

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

  toggleLinkToolbar: function(checkedItem) {
    var toolbar = document.getElementById("linktoolbar");
    if(toolbar) {
      toolbar.setAttribute("hidden", checkedItem.value);
      document.persist("linktoolbar", "hidden");
    }
    this.initHandlers();
    if(this.isLinkToolbarEnabled()) this.fullSlowRefresh();
    else linkToolbarHandler.clearAllItems();
  },

  initLinkbarVisibilityMenu: function() {
    var state = document.getElementById("linktoolbar").getAttribute("hidden");
    if (!state) state = "maybe";
    var checkedItem = document.getElementById("cmd_viewlinktoolbar_" + state);
    checkedItem.setAttribute("checked", true);
    checkedItem.checked = true;
  },

  // "handler for link-added active" is what this means (i think)
  addHandlerActive: false,

  initHandlers: function() {
    var contentArea = document.getElementById("appcontent");
    if (linkToolbarUI.isLinkToolbarEnabled()) {
      if (!linkToolbarUI.addHandlerActive) {
        contentArea.addEventListener("select", linkToolbarUI.tabSelected, false);
        contentArea.addEventListener("DOMLinkAdded", linkToolbarUI.linkAdded, true);
        linkToolbarUI.addHandlerActive = true;
      }
    } else {
      if (linkToolbarUI.addHandlerActive) {
        contentArea.removeEventListener("select", linkToolbarUI.tabSelected, false);
        contentArea.removeEventListener("DOMLinkAdded", linkToolbarUI.linkAdded, true);
        linkToolbarUI.addHandlerActive = false;
      }
    }
  },

  onload: function() {
    document.removeEventListener("load", linkToolbarUI.onload, true);
    linkToolbarUI.initHandlers();
  }
}

document.addEventListener("load", linkToolbarUI.onload, true);
