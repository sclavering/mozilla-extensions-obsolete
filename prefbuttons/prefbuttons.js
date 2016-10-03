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

The Original Code is the Preferences Toolbar 2.

The Initial Developer of the Original Code is Aaron Andersen.

Portions created by the Initial Developer are Copyright (C) 2002
the Initial Developer. All Rights Reserved.

Contributor(s):
  Aaron Andersen <aaron@xulplanet.com>
  Stephen Clavering <mozilla@clav.co.uk> (conversion to PrefButtons extension, tabchecks)

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


const prefbuttons_checks = [
  "prefbuttons:fonts",
  "prefbuttons:colors",
  "prefbuttons:systemcolors",
  "prefbuttons:images",
  "prefbuttons:javascript",
  "prefbuttons:java",
  "prefbuttons:popups",
  "prefbuttons:proxycheck",
  "prefbuttons:cookies",
  "prefbuttons:cookieask",
  "prefbuttons:referrer",
  "prefbuttons:pipelining",
];

const prefbuttons_menuitems = [
  "prefbuttons:useragent",
  "prefbuttons:proxymenu"
];

// checkboxes which need updating when switching tabs
const prefbuttons_tabchecks = [
  "prefbuttons:images-tab",
  "prefbuttons:javascript-tab",
  "prefbuttons:plugins-tab"
];
// the functions used to update them on tab switch, in the same order
const prefbuttons_tabcheck_updaters = [
  function() { this.checked = getBrowser().docShell.allowImages; },
  function() { this.checked = getBrowser().docShell.allowJavascript; },
  function() { this.checked = getBrowser().docShell.allowPlugins; },
];


function setChecks() {
  for(var i = 0; i < prefbuttons_checks.length; i++)
    setCheck(prefbuttons_checks[i]);
  
  PrefButtons.initTabChecks();
}

function setCheck(itemId) {
  var item = document.getElementById(itemId);
  // item will be null if the <toolbaritem> is still on the customisation palette
  if(!item) return;
  try {
    var value = navigator.preference(item.getAttribute("prefstring")); // Value is magic variable referenced in prefstring
  } catch(e) {}
  item.setAttribute("checked",eval(item.getAttribute("frompref")));
}

function changePref(event) {
  var item = event.target;
  var value = !item.checked;
  navigator.preference(item.getAttribute("prefstring"),eval(item.getAttribute("topref")));
}


function setMenulist(id) {
  var item = document.getElementById(id);
  // item will be null if the menulist has been left on the toolbar customisation palette
  if(!item) return;

  var prefstring = item.getAttribute("prefstring");

  var prefsvc = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService)
  prefBranch = prefsvc.getBranch("");

  if(prefBranch.prefHasUserValue(prefstring)) {
    var prefvalue = navigator.preference(prefstring);
    option = item.firstChild.firstChild;
    var i = 0;
    do {
      var value = option.getAttribute("value");   // Value is magic variable referenced in prefstring
      var listvalue = value; //eval(item.getAttribute("topref"));  // No need for topref in menulist?

      if(prefvalue == listvalue) {
        item.selectedIndex = i;
        return;
      }
      i++;
    } while(option = option.nextSibling);

  } else {
    item.selectedIndex = item.getAttribute("default");  // ****** HACK ******
  }

}


function processMenulist(item) {
  var nsIPref = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService)
  prefBranch = nsIPref.getBranch("");

  var pref = item.getAttribute("prefstring");
  var value = item.selectedItem.getAttribute("value");
  var type = prefBranch.getPrefType(pref);

  if(type == prefBranch.PREF_STRING)
    prefBranch.setCharPref(pref, value);
  else if(type == prefBranch.PREF_INT)
    prefBranch.setIntPref(pref, Number(value));
  else if(type == prefBranch.PREF_BOOL)
    prefBranch.setBoolPref(pref, Boolean(value));
  else
    navigator.preference(pref, value);  // Couldn't hurt to try...

  if(value == "")
    prefBranch.clearUserPref(pref);
}



// command functions for the buttons and tabchecks
const PrefButtonCommands = {
  /** These functions control whether images, javascript, and plugins are allowed, and
    * apply to *the current tab only*. They take effect only after the page is refreshed.
    *
    * could also use the allowAuth, allowMetaRedirects and allowSubframes flags of docShell.
    */
  toggleImagesInTab: function(newState) {
    var docShell = getBrowser().docShell; // getBrowser() always gets the <browser> for the current tab
    docShell.QueryInterface(Components.interfaces.nsIDocShell); // just to be sure
    docShell.allowImages = newState;
  },
  toggleJavascriptInTab: function(newState) {
    var docShell = getBrowser().docShell;
    docShell.QueryInterface(Components.interfaces.nsIDocShell);
    docShell.allowJavascript = newState;
  },
  togglePluginsInTab: function(newState) {
    var docShell = getBrowser().docShell;
    docShell.QueryInterface(Components.interfaces.nsIDocShell);
    docShell.allowPlugins = newState;
  },
  
  // other button commands
  clearHistory: function() {
  	var classID = Components.classes['@mozilla.org/browser/global-history;1'];
  	var browserHistory = classID.getService(Components.interfaces.nsIBrowserHistory)
  	browserHistory.removeAllPages();
  },
  clearCache: function(aType) {
  	var classID = Components.classes["@mozilla.org/network/cache-service;1"];
  	var cacheService = classID.getService(Components.interfaces.nsICacheService);
  	cacheService.evictEntries(Components.interfaces.nsICache.STORE_IN_MEMORY);
  	cacheService.evictEntries(Components.interfaces.nsICache.STORE_ON_DISK);
  },
  
  // shouldn't this deal with <object> too?  and frames ?
  killFlash: function() {
  	var page = window._content.document;
  	var flashes = page.getElementsByTagName("embed");
  
  	for(var i = 0; i < flashes.length; i++) {
  		var current = flashes[0];
  		if(current.getAttribute("type")!="application/x-shockwave-flash") continue;
  
  		var height = current.getAttribute("height");
  		var width = current.getAttribute("width");
  
  		if(current.parentNode.nodeName.toLowerCase() == "object") {
  			top = current.parentNode.parentNode;
  			next = current.parentNode;
  		}	else{
  			top = current.parentNode;
  			next = current;
  		}
  
  		if(height && width) {
  			div = document.createElement("DIV");
  			text = document.createTextNode(" ");
  			div.appendChild(text);
  			top.replaceChild(div, next);
  		} else {
  			top.removeChild(current);
  		}
  
  		div.setAttribute("style", "height: " + height + "px; width: " + width + "px; border: 1px solid black;");
  
  		i--;
  	}
  }
}

const PrefButtons = {
  /** Handling of checkbox "prefs" which apply to the current tab only
    *
    * tabChecks - an array of those items from prefbuttons_tabchecks
    *     currently in use
    * initTabChecks - called after customisation to update |tabChecks|,
    *     and give each check an update() function
    * setTabChecks - called on every tab switch to update the state of
    *     each check
    */
  tabChecks: [],
  
  initTabChecks: function() {
    this.tabChecks = [];
    for(var i = 0; i < prefbuttons_tabchecks.length; i++) {
      var check = document.getElementById(prefbuttons_tabchecks[i]);
      if(!check) continue; // this check might not be in use
      check.update = prefbuttons_tabcheck_updaters[i];
      this.tabChecks.push(check);
    }
    this.setTabChecks();
  },
  
  setTabChecks: function() {
    for(var i = 0; i < this.tabChecks.length; i++)
      this.tabChecks[i].update();
  },
  
  
  init: function() {
    // reload tab based prefs on every tab switch
    var appcontent = document.getElementById("appcontent");
    appcontent.addEventListener("select", function(){PrefButtons.setTabChecks();}, false);
    // Reload the prefs whenever the window receives focus
    // (this is also used to update after toolbar customisation)
    window.addEventListener("focus", setChecks, false);
    // Reload the prefs right now (well, 500ms from now)
    setTimeout("setChecks()", 500);
    // init menulists
    for(var i = 0; i < prefbuttons_menuitems.length; i++)
      setMenulist(prefbuttons_menuitems[i]);
  }  
}

window.addEventListener("load",PrefButtons.init,false);

