function diggerLoadURLInNewTab(e) {
  var url = gURLBar.value;
  BrowserOpenTab();
  gURLBar.value = url;
  BrowserLoadURL(e);
}

function diggerMenuCommand(e,menu) {
  var t = e.target;
  if(t.id == "digger-clear-url") {
    // Clear Location
    gURLBar.value = "";
    gURLBar.focus();
  } else if(t.id == "digger-decode-uri") {
    gURLBar.value = unescape(gURLBar.value);
    gURLBar.focus();
  } else {
    var uriToLoad = t.getAttribute("label");
    // load url
  	if(e.button==1) BrowserOpenTab();
  	//e.altKey = true;
    gURLBar.value = uriToLoad;
   	loadURI(uriToLoad);
    _content.focus();
    //BrowserLoadURL(e);
  }
  if(e.button==1) menu.hidePopup();
}

function diggerClearMenu(menu) {
  var fst = menu.firstChild, cur = menu.lastChild, nxt;
  while(cur!=fst) {
    nxt = cur.previousSibling;
    menu.removeChild(cur);
    cur = nxt;
  }
}

function diggerBuildMenu(menu) {
  var url = gURLBar.value;
  var originalUrl = url;
  var matches, regexp, groupEnd;

  // abort if urlbar empty
  if(url.length == 0) {
    menu.hidePopup();
    return;
  }

  // chop off a query string
  matches = url.match(/^([^\?]*?)\?.*/);
  if(matches) {
    url = matches[1]; //its never ==origUrl
    diggerAddMenuItem(menu, matches[1]);
  }

  // trim filename (this makes subdriectory digging easier)
  matches = url.match(/(^.*\/).*/);
  if(!matches) return; //only fails if "url" has no /'s
  url = matches[1];
  if(url!=originalUrl) diggerAddMenuItem(menu, url);

  // dig through subdirs
  regexp = /^([^\/]*?:\/\/.*\/)[^\/]+?\//;
  matches = url.match(regexp);
  while(matches) {
    url = matches[1];
    diggerAddMenuItem(menu, url);
    matches = url.match(regexp);
  }
  // above regexp returns null once we hit a domain
  if(url!=originalUrl) diggerInsertSeperatorAfter(menu.firstChild);
  groupEnd = menu.lastChild;

  // if http offer ftp alternative
  regexp = /^http:/i;
  var altUrl; // ftp for http sites and vice versa
  if(regexp.test(url)) {
    altUrl = url.replace(/^http:\/\/www/i, "ftp://ftp");
    altUrl = altUrl.replace(regexp, "ftp:");
  } else {
    altUrl = url.replace(/^ftp:\/\/ftp/i, "http://www");
    altUrl = altUrl.replace(/^ftp:\/\//i, "http://");
  }
  if(altUrl!=url) {
    diggerAddMenuSeparator(menu);
    diggerAddMenuItem(menu, altUrl);
    groupEnd = menu.lastChild;
  }

  // climb up through subdomains
  var urlchunks = url.split("://");
  if(urlchunks.length == 1) return;  // quit if "url" doesn't contain "://"
  var protocol = urlchunks[0] + "://";
  var domain = urlchunks[1];
  regexp = /^[^\.]*\.(.*)/;
  matches = domain.match(regexp);
  while(matches) {
    domain = matches[1];
    diggerAddMenuItem(menu, protocol+domain);
    matches = domain.match(regexp);
  }
  if(protocol+domain!=url) {
    menu.removeChild(menu.lastChild); //the http://org/ type item
    diggerInsertSeperatorAfter(groupEnd);
  }
}

function diggerAddMenuSeparator(aParent) {
  var separator = document.createElement("menuseparator");
  aParent.appendChild(separator);
}
function diggerInsertSeperatorAfter(menuitem) {
  var separator = document.createElement("menuseparator");
  menuitem.parentNode.insertBefore(separator, menuitem.nextSibling);
}
function diggerAddMenuItem(aParent, aLabel) {
  var menuitem = document.createElement("menuitem");
  menuitem.setAttribute("label", aLabel);
  aParent.appendChild(menuitem);
}
