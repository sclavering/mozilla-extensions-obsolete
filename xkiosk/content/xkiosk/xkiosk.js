/*
# -*- Mode: Java; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*-
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is Mozilla.org Code.
#
# The Initial Developer of the Original Code is Doron Rosenberg.
#
# Portions created by the Initial Developer are Copyright (C) 2001
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   Ben Goodger <ben@netscape.com> (Original Author)
#   Chris Neale <cdn@mozdev.org>
#   Stephen Clavering <mozilla@clav.me.uk>
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****
*/

function xkioskPromptClearAll(el) {
  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                      .getService(Components.interfaces.nsIPromptService);
  if(!promptService.confirm(window, el.getAttribute("prompttitle"), el.getAttribute("promptmsg"))) return;

  xkioskClearHistory();
  xkioskClearFormInfo();
  xkioskClearPasswords();
  xkioskClearDownloads();
  xkioskClearCookies();
  xkioskClearCache();
}


function xkioskClearHistory() {
  // builds from 20040210ish onward use the second class.  the relevant parts
  // of the nsIBrowserHistory are not altered though.
  var class1 = "@mozilla.org/browser/global-history;1";
  var class2 = "@mozilla.org/browser/global-history;2";
  var history = (class2 in Components.classes) ? class2 : class1;
  history = Components.classes[history].getService(Components.interfaces.nsIBrowserHistory);
  history.removeAllPages();

  // used to clear the history on back/forward buttons, and the <browser/> session history
  var os = Components.classes["@mozilla.org/observer-service;1"]
                     .getService(Components.interfaces.nsIObserverService);
  os.notifyObservers(null, "browser:purge-session-history", "");
}


function xkioskClearFormInfo() {
  var formHistory = Components.classes["@mozilla.org/satchel/form-history;1"]
                              .getService(Components.interfaces.nsIFormHistory);
  formHistory.removeAllEntries();
}


function xkioskClearPasswords() {
  var passwdMgr = Components.classes["@mozilla.org/passwordmanager;1"].getService();
  passwdMgr = passwdMgr.QueryInterface(Components.interfaces.nsIPasswordManager);

  var e = passwdMgr.enumerator;
  var passwds = [];
  while (e.hasMoreElements()) {
    var passwd = e.getNext().QueryInterface(Components.interfaces.nsIPassword);
    passwds.push(passwd);
  }

  for (var i = 0; i < passwds.length; ++i)
    passwdMgr.removeUser(passwds[i].host, passwds[i].user);
}


// xxx should this cancel active downloads?
function xkioskClearDownloads() {
  var dm = Components.classes["@mozilla.org/download-manager;1"].getService(Components.interfaces.nsIDownloadManager);
  if(dm.canCleanUp) dm.cleanUp();
}


function xkioskClearCookies() {
  var cookieman = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager);
  cookieman.removeAll();
}


function xkioskClearCache() {
  var cacheService = Components.classes["@mozilla.org/network/cache-service;1"].getService(Components.interfaces.nsICacheService);
  cacheService.evictEntries(Components.interfaces.nsICache.STORE_ON_DISK);
  cacheService.evictEntries(Components.interfaces.nsICache.STORE_IN_MEMORY);
}
