const APP_DISPLAY_NAME = "Digger";
const APP_NAME = "digger";
const APP_PACKAGE = "/clav.me.uk/digger";
const APP_VERSION = "0.5.5";

const APP_JAR_FILE = "digger.jar";
const APP_CONTENT_FOLDER = "content/";
const APP_LOCALE_FOLDER  = "locale/en-US/";

const INST_TO_PROFILE = "Do you wish to install "+APP_DISPLAY_NAME+" to you profile?\nThis will mean it does not need reinstalling when you update Firebird.\n(Click Cancel if you want "+APP_DISPLAY_NAME+" installing to the Firebird directory.)";

initInstall(APP_NAME, APP_PACKAGE, APP_VERSION);

// profile installs only work since 2003-03-06
var instToProfile = (buildID>2003030600 && confirm(INST_TO_PROFILE));

var chromef = instToProfile ? getFolder("Profile", "chrome") : getFolder("chrome");
var err = addFile(APP_PACKAGE, APP_VERSION, APP_JAR_FILE, chromef, null)
if(err == SUCCESS) {
	var jar = getFolder(chromef, APP_JAR_FILE);
	if(instToProfile) {
  	registerChrome(CONTENT | PROFILE_CHROME, jar, APP_CONTENT_FOLDER);
  	registerChrome(LOCALE  | PROFILE_CHROME, jar, APP_LOCALE_FOLDER);
  } else {
  	registerChrome(CONTENT | DELAYED_CHROME, jar, APP_CONTENT_FOLDER);
  	registerChrome(LOCALE  | DELAYED_CHROME, jar, APP_LOCALE_FOLDER);
  }
	err = performInstall();
	if(err != SUCCESS && err != 999) {
		alert("Install failed. Error code:" + err);
		cancelInstall(err);
	}
} else {
	alert("Failed to create " +APP_JAR_FILE +"\n"
		+"You probably don't have appropriate permissions \n"
		+"(write access to your profile or chrome directory). \n"
		+"_____________________________\nError code:" + err);
	cancelInstall(err);
}