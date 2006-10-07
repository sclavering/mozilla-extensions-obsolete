function diggerInit(ev) {
  removeEventListener("load", diggerInit, false);
  const cm = document.getElementById("contentAreaContextMenu");
  cm.addEventListener("popupshowing", diggerShowContextSubmenu, false);
}
addEventListener("load", diggerInit, false);


function diggerShowContextSubmenu(ev) {
  const cm = gContextMenu;
  cm.showItem("context-digger", cm.onLink || !(cm.isTextSelected || cm.onImage || cm.onTextInput));
}


function diggerLoadURL(e, popup, isMiddleClick) {
  var url = e.target.getAttribute("label");
  openUILink(url, e);
  if(isMiddleClick) popup.hidePopup();
}


function diggerBuildGoMenu(menu) {
  var url = gURLBar.value || content.location.href;
  if(!url || url=="about:blank") return false;
  return diggerFillMenu(url, menu, false);
}


function diggerBuildContextMenu(menu) {
  const cm = gContextMenu;
  const url = cm.onLink ? cm.linkURL : content.document.location.href;
  if(!url) return;
  diggerFillMenu(url, menu, true);
}


function diggerFillMenu(url, menu, show_original) {
  if(menu.url == url) return true;
  menu.url = url;
  // clear menu
  while(menu.hasChildNodes()) menu.removeChild(menu.lastChild);

  var needSeparator = false; // set true to insert a separator between groups
  var haveItems = false;     // true iff a link has been inserted 

  function addItem(label) {
    if(needSeparator && haveItems)
      menu.appendChild(document.createElement("menuseparator")), needSeparator = false;
    var menuitem = document.createElement("menuitem");
    menuitem.setAttribute("label", label);
    menu.appendChild(menuitem);
    haveItems = true;
  }

  if(show_original) addItem(url);

  // chop off query string
  var i = url.lastIndexOf("?");
  if(i != -1) {
    url = url.substring(0, i);
    addItem(url);
    // xxx look for urls in the query string
  }

  var bits = url.match(/^([^:]*:\/{0,3})(.*)/);
  var protocol, remainder;
  if(bits) protocol = bits[1], remainder = bits[2];
  else protocol = "", remainder = url;

  var path = remainder.split("/"), host = path.shift();
  if(!path[path.length-1]) path.pop(); // happens when the url ends in a /

  // remove bits of the path
  var pre = protocol+host+"/";
  if(path.length) {
    path.pop();
    while(path.length) {
      addItem(pre + path.join("/") + "/");
      path.pop();
    }
    addItem(pre);
  }
  needSeparator = true;

  // ftp equiv. to http and vice versa
  if(protocol == "http://") {
    addItem("ftp://" + host.replace(/^www\./, "ftp.") + "/");
  } else if(protocol == "ftp://") {
    addItem("http://" + host.replace(/^ftp\./, "www.") + "/");
  }
  needSeparator = true;

  // dig through subdomains
  bits = host.split(".");
  while(bits.length > 2) {
    bits.shift();
    addItem(protocol + bits.join(".") + "/");
  }

  // we might not have put anything on the menu
  return haveItems;
}
