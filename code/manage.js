// This object exists primarily as a listing of the id's of form controls used
// (which are also part of the names of the corresponding prefs).  The booolean
// values indicate whether the field is relevant when using a PAC file, and are
// used to disable certain form controls.
const ui_field_names = {
  user_description: false,
  autoconfig_url: false,
  http: true,
  ssl: true,
  ftp: true,
  socks: true,
  socks_version: true,
  no_proxies_on: true
};
const ui_fields = {}; // id -> xul Element

// Array of proxypicker_Proxy objects
var gProxies = null;

// The object storing the settings for the proxy currently being displayed
// This will reference an object in |gProxies|, not a copy.
var gProxy = {};

var prefs = null; // nsIPrefBranch
var gListbox = null; // <listbox>
var gTree = null; // <tree>!

function init() {
  for(var id in ui_field_names) ui_fields[id] = document.getElementById(id);
  for each(var el in ui_fields) el.setAttribute("onchange", "on_field_change(this)");

  gListbox = document.getElementById("proxies-list");
  gProxies = proxypicker_loadProxyList();

  gListbox.view = treeView;
  gListbox.currentIndex = 0;
  gListbox.view.selection.select(0);

//   gListbox.view = treeView;
//   gListbox.selectedIndex = 0;
  // This will indirectly update the right-hand panel too (via a select event)
//   document.getElementById("proxies-list").selectedIndex = 0;
//   setTimeout(delayed_init, 0);
}
window.onload = init;

function delayed_init() {
}

function read_proxies() {
  const proxies = [];
  for(var i = 0; true; ++i) {
    var done = true;
    try { done = !prefs.getBoolPref("proxies." + i); } catch(e) {}
    if(done) break;
    var pref_prefix = "proxies." + i + ".";
    var proxy = {};
    proxies.push(proxy);
    for(var field in ui_field_names)
      proxy[field] = get_pref(pref_prefix + field);
  }
  return proxies;
}

function get_pref(name) {
  try { return prefs.getCharPref(name); } catch(e) {};
  return "";
}

function update_fields() {
  for(var id in ui_fields) ui_fields[id].value = gProxy[id];
//   alert(gProxy.socks_version +" "+ui_fields.socks_version +" "+ui_fields.socks_version.value);
}

function on_field_change(field) {
//   const field = event.currentTarget;
  alert(field.tagName +" "+field.id);
  gProxy[field.id] = field.value || ""; // the || avoids "undefined"
}

// Was going to disable the irrelevant inputs when a PAC file is specified, but
// disabled text fields are indistinguishable from enabled ones in Ubuntu's
// Human theme, making that liable to confuse.
function on_autoconfig_input(event) {
  const should_disable = !!event.target.value;
  const are_disabled = document.getElementById("http").disabled;
  if(should_disable == are_disabled) return;
  for(var id in ui_field_names) {
    var field = document.getElementById(id);
    if(ui_field_names[id]) field.disabled = should_disable;
  }
}

function on_description_input(event) {
//   gListbox.treeBoxObject.();
}

function on_proxy_list_select(event) {
  gProxy = gProxies[event.target.currentIndex];
  update_fields();
}

function add_proxy() {
  gProxies.push(new proxypicker_Proxy("Wivvl"));
  gListbox.treeBoxObject.rowCountChanged(gProxies.length, 1);
  gListbox.treeBoxObject.invalidate();
}


// An exceedingly minimal nsITreeView for the list of proxies
const treeView = {
  get rowCount() {
//     alert("hi there rowc="+gProxies.length)
    return gProxies.length;
  },
  getCellText: function(row, column) {
    return gProxies[row].user_description || ("Proxy " + row);
  },
  setTree: function(treebox) {
    this._treebox = treebox;
  },

  isContainer: function(row) { return false; },
  isSeparator: function(row) { return false; },
  isSorted: function() { return false; },
  getLevel: function(row) { return 0; },
  getImageSrc: function(row, col) { return null; },
  getRowProperties: function(row, props) {},
  getCellProperties: function(row, col, props) {},
  getColumnProperties: function(colid, col, props) {}
}


function ondialogaccept() {
  proxypicker_saveProxiesList(gProxies);
}
