/* This code is licensed under the Mozilla Public Licence version 1.1

   Code written by Stephen Clavering <mozilla@clav.co.uk>

   Originally written for the Digger extension for Mozilla Firebird
   */


const linkToolbarUrlDigger = {
  commanded: function(e,menu) {
    var t = e.target;
    var uriToLoad = t.getAttribute("label");
    // load url

    if(e.button==1) BrowserOpenTab();
    
     gURLBar.value = uriToLoad;
      loadURI(uriToLoad);
       _content.focus();

    if(e.button==1) menu.hidePopup();
  },

  clearMenu: function(menu) {
    while(menu.hasChildNodes()) menu.removeChild(menu.lastChild);
  },

  buildMenu: function(menu) {
    var url = gURLBar.value;
    var matches, regexp, groupEnd, originalUrl = url;

    // abort if urlbar empty
    if(url.length == 0) {
      menu.hidePopup();
      return;
    }

    // chop off a query string
    matches = url.match(/^([^\?]*?)\?.*/);
    if(matches) {
      url = matches[1]; //its never ==origUrl
      this.addItem(menu, matches[1]);
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
    if(url!=originalUrl) this.insertSeperatorAfter(menu.firstChild);
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

    return true;
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
    // set this so we can inherit the linkToolbar onclick code.
    menuitem.setAttribute("href",url);
    menu.appendChild(menuitem);
  }
};