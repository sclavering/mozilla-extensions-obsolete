function gotoLoadURLInNewTab(e) {
  var url = gURLBar.value;
  BrowserOpenTab();
  gURLBar.value = url;
  BrowserLoadURL(e);
}

var GoTo = {
  init: function() {
    document.getElementById("contentAreaContextMenu").addEventListener("popupshowing",GoTo.hideMenu,false);
  },

  commanded: function(e,menu) {
    var t = e.target;
    if(t.id == "goto-clear-url") {
      // Clear Location
      gURLBar.value = "";
      gURLBar.focus();
    } else {
      // load url
      var uriToLoad = t.getAttribute("label");
    	if(e.button==1) BrowserOpenTab();
      gURLBar.value = uriToLoad;
     	loadURI(uriToLoad);
      _content.focus();
    }
    if(e.button==1) menu.hidePopup();
  },

  // called onPopupShowing for the main context menu. hides GoTo if it's not relevant
  hideMenu: function() {
    var cm = gContextMenu;
    document.getElementById("context-goto").hidden = ( cm.isTextSelected || cm.onImage || cm.onTextInput );
  },

  clearMenu: function(menu) {
    while(menu.hasChildNodes()) menu.removeChild(menu.lastChild);
  },

  // wander out from the node the context menu was called on and try and find a link
  // return the href attribute.
  // in future this may need expanding to deal with xlinks, but we'll live without for now
  getLink: function() {
    var elem = document.popupNode;
    while(elem) {
      if(elem instanceof Components.interfaces.nsIDOMHTMLAnchorElement && elem.href)
        return elem.href;
      elem = elem.parentNode;
    }
    return null;
  },

  buildMenu: function(menu) {
    var url = this.getLink();
    var matches, str, regexp, groupEnd, originalUrl = url;

    // if were not on a link, give Digger functionality
    // XXX should retrieve current document location, not url bar value
    if(!url) url = gURLBar.value;
    if(url.length == 0) return;

    // chop off a query string and deal woth urls like
    // http://www.example.com/redirect.php?http://www.foo.com/&foo=blah
    matches = url.split("?");
    if(matches[1]) {
      str = matches[1];
      if(/^(ht|f)tp:\/\//.test(str)) {
        str = str.split("&")[0];
        this.addItem(menu, str);
      }
    }
    if(matches[0]) {
      url = matches[0];
      this.addItem(menu, url);
    }

    // trim filename (this makes subdriectory digging easier)
    matches = url.match(/(^.*\/).*/);
    if(!matches) return; //only fails if "url" has no /'s
    url = matches[1];
    if(url!=originalUrl) {
      this.addItem(menu, url);
    }

    // dig through subdirs
    regexp = /^([^\/]*?:\/\/.*\/)[^\/]+?\//;
    matches = url.match(regexp);
    while(matches) {
      url = matches[1];
      this.addItem(menu, url);
      matches = url.match(regexp);
    }
    // above regexp returns null once we hit a domain
    groupEnd = menu.lastChild;

    // if http offer ftp alternative + vice versa
    regexp = /^http:/i;
    var altUrl;
    if(regexp.test(url)) {
      altUrl = url.replace(/^http:\/\/www/i, "ftp://ftp");
      altUrl = altUrl.replace(regexp, "ftp:");
    } else {
      altUrl = url.replace(/^ftp:\/\/ftp/i, "http://www");
      altUrl = altUrl.replace(/^ftp:\/\//i, "http://");
    }
    if(altUrl!=url) {
      this.addSeperator(menu);
      this.addItem(menu, altUrl);
      groupEnd = menu.lastChild;
    }

    // climb up through subdomains
    var numdomains = 0;
    var urlchunks = url.split("://");
    if(urlchunks.length == 1) return;  // quit if "url" doesn't contain "://"
    var protocol = urlchunks[0] + "://";
    var domain = urlchunks[1];
    regexp = /^[^\.]*\.(.*)/;
    matches = domain.match(regexp);
    while(matches) {
      domain = matches[1];
      this.addItem(menu, protocol+domain);
      numdomains++;
      matches = domain.match(regexp);
    }
    if(numdomains>0) menu.removeChild(menu.lastChild); //the http://org/ type item
    if(numdomains>1) this.insertSeperatorAfter(groupEnd);
  },

  addSeperator: function(menu) {
    menu.appendChild(document.createElement("menuseparator"));
  },
  insertSeperatorAfter: function(menuitem) {
    var separator = document.createElement("menuseparator");
    menuitem.parentNode.insertBefore(separator, menuitem.nextSibling);
  },
  addItem: function(menu, url) {
    var menuitem = document.createElement("menuitem");
    menuitem.setAttribute("label",url);
    menu.appendChild(menuitem);
  }
};

window.addEventListener("load",GoTo.init,false);
