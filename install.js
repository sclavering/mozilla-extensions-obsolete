const APP_DISPLAY_NAME = "Toolbar Enhancements";
const APP_NAME = "toolbarext";
const APP_PACKAGE = "/clav.mozdev.org/toolbarext";
const APP_VERSION = "0.2";

const APP_JAR_FILE = "toolbarext.jar";
const APP_CONTENT_FOLDER = "content/";
const APP_LOCALE_FOLDER  = "locale/en/";
const APP_SKIN_FOLDER  = "skin/classic/";

const INST_TO_PROFILE = "Do you wish to install "+APP_DISPLAY_NAME+" to your profile?\n\nClick OK to install to your profile.\n\nClick Cancel if you want to install globally.";

initInstall(APP_NAME, APP_PACKAGE, APP_VERSION);

var instToProfile = confirm(INST_TO_PROFILE);
var flag = instToProfile ? PROFILE_CHROME : DELAYED_CHROME;
var chromef = instToProfile ? getFolder("Profile", "chrome") : getFolder("chrome");

var err = addFile(APP_PACKAGE, APP_VERSION, APP_JAR_FILE, chromef, null)
if(err == SUCCESS) {
	var jar = getFolder(chromef, APP_JAR_FILE);
	registerChrome(CONTENT | flag, jar, APP_CONTENT_FOLDER);
	registerChrome(LOCALE  | flag, jar, APP_LOCALE_FOLDER);
	registerChrome(SKIN  | flag, jar, APP_SKIN_FOLDER);
	err = performInstall();
	if(err!=SUCCESS && err!=999) {
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
