const APP_DISPLAY_NAME = "Link Toolbar";
const APP_NAME = "linktoolbar";
const APP_PACKAGE = "/cdn.mozdev.org/linktoolbar";
const APP_VERSION = "0.6.5";

const APP_JAR_FILE = "linkToolbar.jar";
const APP_CONTENT_FOLDER = "content/linktoolbar/";
const APP_LOCALE_FOLDER  = "locale/en-US/linktoolbar/";
const APP_SKIN_FOLDER  = "skin/classic/";

const INST_TO_PROFILE = "Do you wish to install "+APP_DISPLAY_NAME+" to your profile?\nThis will mean it does not need reinstalling when you update your browser.\n(Click Cancel if you want "+APP_DISPLAY_NAME+" installing to the main browser directory.)";

initInstall(APP_NAME, APP_PACKAGE, APP_VERSION);

var instToProfile = confirm(INST_TO_PROFILE);

var chromef = instToProfile ? getFolder("Profile", "chrome") : getFolder("chrome");
var flag = instToProfile ? PROFILE_CHROME : DELAYED_CHROME;

var err = addFile(APP_PACKAGE, APP_VERSION, APP_JAR_FILE, chromef, null)
if(err == SUCCESS) {
	var jar = getFolder(chromef, APP_JAR_FILE);
	registerChrome(CONTENT | flag, jar, APP_CONTENT_FOLDER);
	registerChrome(LOCALE  | flag, jar, APP_LOCALE_FOLDER);
	registerChrome(SKIN    | flag, jar, APP_SKIN_FOLDER);

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
