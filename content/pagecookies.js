function tbxCookie(name,value,isDomain,host,rawHost,path,isSecure,expires,status,policy) {
  this.name = name;
  this.value = value;
  this.isDomain = isDomain;
  this.host = host;
  this.rawHost = rawHost;
  this.path = path;
  this.isSecure = isSecure;
  this.expires = expires;
  this.status = status;
  this.policy = policy;
}


var tbxPageCookiesMenu = {
  cookieManager: null,

  bundle: null,

  getBundle: function() {
    if(!this.bundle) this.bundle = document.getElementById("tbx-cookieinfo-bundle");
    return this.bundle;
  },

  cookiesByHost: [],
  hosts: [],
  hostsStr: "",

  getCookies: function() {
    // get all the hosts we should list cookies for (i.e. the hosts for all current <frame>s
    this.hostsStr = "";
    this.hosts = new Array();
    this.getHost(window._content);

    this.cookiesByHost = new Array();

    if(!this.cookieManager) this.cookieManager = Components.classes["@mozilla.org/cookiemanager;1"]
                                                 .getService(Components.interfaces.nsICookieManager);

    // get cookies, restricted and hashed by the hosts for all curent pages
    var enumerator = this.cookieManager.enumerator; // an nsISimpleEnumerator
    while(enumerator.hasMoreElements()) {
      var cookie = enumerator.getNext();
      if(!cookie) break;
      cookie = cookie.QueryInterface(Components.interfaces.nsICookie);

      var rawhost = cookie.host;
      var host = (rawhost.charAt(0)==".") ? rawhost.substring(1) : rawhost

      // we do string comparisons because we want to show cookies for (for ex.)
      // doubleclick.net when there is a frame from ad.doubleclick.net showing
      // (die doubleclick.net die!)
      if(this.hostsStr.indexOf(host+' ')==-1) continue;

      if(!(host in this.cookiesByHost)) this.cookiesByHost[host] = new Array();

      var cookieobj = new tbxCookie(cookie.name, cookie.value, cookie.isDomain, rawhost, host,
                      cookie.path, cookie.isSecure, cookie.expires, cookie.status, cookie.policy);
      this.cookiesByHost[host].push(cookieobj);
    }
  },

  getHost: function(frame) {
    // for about:blank and some other things frame.location.host throws an exception
    try {
      var host = frame.location.host;
      if(!(host in this.hosts)) {
        this.hosts[host] = host;
        this.hostsStr += host + ' ';
      }
    } catch(e) {}
    for(var i = 0; i < frame.frames.length; i++)
      this.getHost(frame.frames[i]);
  },

  // build the menupopup for the cookie-button.
  showMenu: function(menu, evt) {
    // popupshowing events from the submenus bubble and trigger this handler,
    // which causes the menu to rebuild, and then makes Fb crash. Not Good.
    if(evt.originalTarget!=menu) return;

    this.emptyMenu(menu); // just in case
    var separator = menu.lastChild.previousSibling;

    this.getCookies();

    var bundle = this.getBundle();
    var havePageCookies = false;

    for(var host in this.cookiesByHost) {
      if(!havePageCookies) havePageCookies = true;

      // create a menu for this host
      var sub = document.createElement("menu");
      sub.setAttribute("label",host);
      var popup = document.createElement("menupopup");
      popup.addEventListener("command", function(e){tbxPageCookiesMenu.commanded(e);}, false);
      sub.appendChild(popup);
      menu.insertBefore(sub,separator);

      // list cookies for this host
      var cookies = this.cookiesByHost[host];
      for(var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        var item = document.createElement("menuitem");
        item.setAttribute("label", bundle.getFormattedString("removeCookie",[cookie.name]));
        item.setAttribute("tooltip","tbx-pagecookies-tooltip");

        item.cookie = cookie;
        popup.appendChild(item);
      }

      popup.appendChild(document.createElement("menuseparator"));
      var removeAll = document.createElement("menuitem");
      removeAll.setAttribute("label", bundle.getFormattedString("removeAll",[host]));
      removeAll.value = "removeall";
      popup.appendChild(removeAll);
      var removeAndBlock = document.createElement("menuitem");
      removeAndBlock.setAttribute("label", bundle.getFormattedString("removeAndBlock",[host]));
      removeAndBlock.value = "removeandblock";
      popup.appendChild(removeAndBlock);
    }

    // hide the <menuseparator> if there's nothing above it
    separator.hidden = !havePageCookies;
  },

  emptyMenu: function(menu, evt) {
    // see first line of showMenu
    if(evt && evt.originalTarget!=menu) return;

    var separator = menu.lastChild.previousSibling;
    while(menu.firstChild!=separator) menu.removeChild(menu.firstChild);
    this.cookiesByHost = [];
    this.hosts = [];
  },

  commanded: function(evt) {
    var target = evt.originalTarget;
    if("cookie" in target) this.removeCookie(target.cookie, false);
    else if(target.value=="removeall") this.removeAllCookies(target,false);
    else if(target.value=="removeandblock") this.removeAllCookies(target,true);
  },

  removeCookie: function(cookie, block) {
    this.cookieManager.remove(cookie.rawHost,cookie.name,cookie.path,block);
  },

  removeAllCookies: function(item, block) { // item is the menuitem that triggered this
    // get last cookie
    while(item && !("cookie" in item)) item = item.previousSibling;
    // remove each cookie, and (if |block|) tell the cookie manager to block the host for the last one removed
    for(; item; item = item.previousSibling) this.removeCookie(item.cookie, block && !item.previousSibling);
  }
};



var tbxCookieInfo = {
  dateService: null,

  bundle: null,

  getBundle: function() {
    if(!this.bundle) this.bundle = document.getElementById("tbx-cookieinfo-bundle");
    return this.bundle;
  },

  getExpiryDate: function(expires) {
    if(!this.dateService) {
      this.dateService = Components.classes["@mozilla.org/intl/scriptabledateformat;1"]
                                   .getService(Components.interfaces.nsIScriptableDateFormat);
    }

    if(!expires) return this.getBundle().getString("AtEndOfSession");

    var date = new Date(1000*expires);
    var svc = this.dateService;
    return svc.FormatDateTime("", svc.dateFormatLong, svc.timeFormatSeconds, date.getFullYear(),
        date.getMonth()+1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
  },

  getPolicyString: function(policy) {
    var nsICookie = Components.interfaces.nsICookie;
    var bundle = this.getBundle();
    switch(policy) {
      case nsICookie.POLICY_NONE:
        return bundle.getString("policyUnstated");
      case nsICookie.POLICY_NO_CONSENT:
        return bundle.getString("policyNoConsent");
      case nsICookie.POLICY_IMPLICIT_CONSENT:
        return bundle.getString("policyImplicitConsent");
      case nsICookie.POLICY_EXPLICIT_CONSENT:
        return bundle.getString("policyExplicitConsent");
      case nsICookie.POLICY_NO_II:
        return bundle.getString("policyNoIICollected");
    }
    return "";
  },

  showInfo: function(cookie) {
    var bundle = this.getBundle();
    var isDomain = cookie.isDomain ? bundle.getString("domainColon") : bundle.getString("hostColon");
    var isSecure = cookie.isSecure ? bundle.getString("yes") : bundle.getString("no");
    var expires = this.getExpiryDate(cookie.expires);
    var policy = this.getPolicyString(cookie.policy);

    var fields = ["name","value","isDomain","host","path","isSecure","expires","policy"];
    var values = [cookie.name, cookie.value, isDomain, cookie.host, cookie.path, isSecure, expires, policy];

    for(var i = 0; i < fields.length; i++) {
      var field = document.getElementById("tbx-cookieinfo-"+fields[i]);
      field.value = values[i];
    }
  },

  show: function(event) {
    var mi = document.tooltipNode;
    if(!("cookie" in mi) || !mi.cookie) return;
    this.showInfo(mi.cookie);
  }
};



var tbxCookiePrefMenu = {
  // xxx: use pref observers from nsIPrefBranchInternal ?
  update: function(menu,evt) {
    for(var item = menu.firstChild; item; item = item.nextSibling) {
      var pref = item.getAttribute("prefstring");
      pref = gPrefService.getBoolPref(pref);
      if(pref) item.setAttribute("checked","true");
      else item.removeAttribute("checked");
    }
  },

  setPref: function(evt) {
    var target = evt.originalTarget;
    var pref = target.getAttribute("prefstring");
    if(!pref) return;
    var checked = target.getAttribute("checked")=="true";
    gPrefService.setBoolPref(pref,checked);
  }
};
