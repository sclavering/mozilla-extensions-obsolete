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

/*
function toggleLinkToolbar() {

 var btn = document.getElementById("linktoolbar-toggle");
 var toolbar = document.getElementById("linktoolbar");

 if (toolbar.getAttribute("hidden") == "true")
 {
   toolbar.setAttribute("hidden", "false");
   btn.setAttribute("left", "false");
 }
 else
 {
   toolbar.setAttribute("hidden", "true");
   btn.setAttribute("left", "true");
 }
}
*/



const linkToolbarUI = {
  // scope is weird throught this function (|this| refers to the function itself)
  linkAdded: function(event) {
    var element = event.originalTarget;
    var doc = element.ownerDocument;
    if(!linkToolbarUI.isLinkToolbarEnabled()
        || !element instanceof Components.interfaces.nsIDOMHTMLLinkElement
        || !element.href
        || !(element.rel || element.rev))
      return;
    
    var linkInfo;
    if(doc == getBrowser().contentDocument) {
      linkInfo = linkToolbarHandler.handleElement(element);
      if(linkInfo) linkToolbarUI.hasItems = true;
    } else {
      linkInfo = linkToolbarHandler.getLinkElementInfo(element);
    }

    // linkInfo will be null if the link was one that linkToolbarHandler.isLinkIgnored didn't like
    if(linkInfo) linkToolbarUI.rememberLink(linkInfo, doc);
  },
  
  rememberLink: function(linkInfo, doc) {
    if(!linkInfo) return;
    if(!("__lt__links" in doc)) doc.__lt__links = new Array();
    doc.__lt__links.push(linkInfo);
  },

  isLinkToolbarEnabled: function() {
    var bar = document.getElementById("linktoolbar");
    if(!bar) return false; // it's on the Fb toolbar customisation palette
    if(bar.getAttribute("hidden")=="true") return false;
    return true;
  },

  clear: function(event) {
    if(event.originalTarget != getBrowser().contentDocument
        || !linkToolbarUI.isLinkToolbarEnabled())
      return;
    linkToolbarHandler.clearAllItems();
  },

  tabSelected: function(event) {
    if(event.originalTarget.localName != "tabs"
        || !linkToolbarUI.isLinkToolbarEnabled())
      return;
    linkToolbarHandler.clearAllItems();
    linkToolbarUI.refresh();
//    linkToolbarUI.fullSlowRefresh();
  },
  
  refresh: function() {
    var currentdoc = window._content.document;
    if(!("__lt__links" in currentdoc)) {
      this.hasItems = false;
      return;
    }  
    var links = currentdoc.__lt__links;
    for(var i = 0; i < links.length; i++)
      linkToolbarHandler.handleLink(links[i]);
    
    this.hasItems = (links.length!=0);
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

  
  /* When in "show as needed" mode we leave the bar visible after a page unloads
   * until the next page has loaded and we can be sure it has no links, at which
   * point this function is called.
   * (Note: this used to be done by the deactivate() method.)
   */
  pageLoaded: function(evt) {
    if(evt.originalTarget != getBrowser().contentDocument) return;
    if(linkToolbarHandler.hasItems) return;
    
    linkToolbarUI.hasItems = false;
  },

  
  /* The "hasitems" attribute is used to show/hide the toolbar in the
   * "show when needed mode. This property is used to set/clear it */
  _hasItems: false,
  set hasItems(val) {
    if(val==this._hasItems) return;
    document.getElementById("linktoolbar").setAttribute("hasitems",val);
    this._hasItems = val;
  },
  get hasItems() {
    return this._hasItems;
  },


  // called whenever something on the toolbar gets an onclick event
  // (onclick used to get middle-clicks.  otherwise we would use oncommand)
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
    } catch(e) {
      dump("LinkToolbar Error: it is not permitted to load this URI from a <link> element: " + e);
      return;
    }

    // XXX use pref listeners rather than checking every time
    var openTabs = true, openTabsInBackground = true;
    try {
  	  openTabs = gPrefService.getBoolPref("browser.tabs.opentabfor.middleclick")
      openTabsInBackground = gPrefService.getBoolPref("browser.tabs.loadInBackground");
    } catch(e) {}

  	// handle middleclick/ctrl+click/shift+click (nearly) as for links in page
  	if(event.button==1 && openTabs || event.ctrlKey) {
      // This is a hack to invert the open-in-background behaviour for new tabs
      // It ensures that a click opens in foreground, shift+click in background
      var e = openTabsInBackground ? {shiftKey: !event.shiftKey} : event;
      openNewTabWith(destURL, null, e, false);
      return;
    }
    if(event.button==1 || event.shiftKey) {
      openNewWindowWith(destURL, null, false);
      return;
  	}
  	
  	var referrer = Components.classes["@mozilla.org/network/standard-url;1"]
  	                         .createInstance(Components.interfaces.nsIURI);
  	referrer.spec = window.content.location.href;
  	loadURI(destURL, referrer);
  },

  toggleLinkToolbar: function(checkedItem) {
    var toolbar = document.getElementById("linktoolbar");
    if(toolbar) {
      toolbar.setAttribute("hidden", checkedItem.value);
      document.persist("linktoolbar", "hidden");
    }
    if(this.isLinkToolbarEnabled()) {
      this.addHandlers();
      this.fullSlowRefresh();
    } else {
      this.removeHandlers();
      linkToolbarHandler.clearAllItems();
    }
  },
  toggleIconsOnly: function(menuitem) {
    var toolbar = document.getElementById("linktoolbar");
    alert(menuitem +" "+menuitem.getAttribute("checked"));
    if(menuitem.getAttribute("checked")=="true")
      toolbar.setAttribute("iconsonly","true");
    else
      toolbar.removeAttribute("iconsonly");
    document.persist("linktoolbar","iconsonly");
  },
    

  initLinkbarVisibilityMenu: function() {
    var bar = document.getElementById("linktoolbar");
    var state = bar.getAttribute("hidden");
    if(!state) state = "maybe";
    var checkedItem = document.getElementById("cmd_viewlinktoolbar_" + state);
    checkedItem.setAttribute("checked", true);
    checkedItem.checked = true;
    // icons only toggle
    var iconsonly = (bar.getAttribute("iconsonly")=="true");
    var item = document.getElementById("linktoolbar-iconsonly");
    item.setAttribute("checked",iconsonly);
  },

  // "handler for link-added active" is what this means (i think)
  handlersActive: false,

  initHandlers: function() {
    if(linkToolbarUI.isLinkToolbarEnabled()) this.addHandlers();
    else this.removeHandlers();
  },
  addHandlers: function() {
    if(linkToolbarUI.handlersActive) return;
    var contentArea = document.getElementById("appcontent");
    contentArea.addEventListener("select", linkToolbarUI.tabSelected, false);
    contentArea.addEventListener("DOMLinkAdded", linkToolbarUI.linkAdded, true);
    contentArea.addEventListener("unload", linkToolbarUI.clear, true);
    contentArea.addEventListener("load", linkToolbarUI.pageLoaded, true);
    contentArea.addEventListener("DOMHeadLoaded", linkToolbarUI.pageLoaded, true);
    linkToolbarUI.handlersActive = true;
  },
  removeHandlers: function() {
    if(!linkToolbarUI.handlersActive) return;
    var contentArea = document.getElementById("appcontent");
    contentArea.removeEventListener("select", linkToolbarUI.tabSelected, false);
    contentArea.removeEventListener("DOMLinkAdded", linkToolbarUI.linkAdded, true);
    contentArea.removeEventListener("unload", linkToolbarUI.clear, true);
    contentArea.removeEventListener("load", linkToolbarUI.pageLoaded, true);
    contentArea.removeEventListener("DOMHeadLoaded", linkToolbarUI.pageLoaded, true);
    linkToolbarUI.handlersActive = false;
  },

  // multiline tooltips.  text is loaded from tooltiptext[012] attributes
  fillTooltip: function(tooltipElement) {
    var text1 = tooltipElement.getAttribute("tooltiptext1");
    // for items on the toolbar itself
    if(text1=="") text1 = tooltipElement.getAttribute("tooltiptext0");
    var line1 = document.getElementById("linktoolbar-tooltip-1");
    linkToolbarUI.fillTooltipLine(line1,text1);
    var text2 = tooltipElement.getAttribute("tooltiptext2");
    var line2 = document.getElementById("linktoolbar-tooltip-2");
    linkToolbarUI.fillTooltipLine(line2,text2);
    // return value indicates if the tooltip should be allowed to show
    return ((text1 && text1!="") || (text2 && text2!=""));
  },
  fillTooltipLine: function(line, text) {
    var notempty = (text && text!="");
    if(notempty) line.value = text;
    line.hidden = !notempty;
  },

  onload: function() {
    linkToolbarUI.initHandlers();
  }
}

window.addEventListener("load", linkToolbarUI.onload, false);
