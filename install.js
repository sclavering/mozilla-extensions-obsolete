const kDisplayName = "xKiosk";
const kName = "xkiosk";
const kPackage = "/cdn.mozdev.org/xkiosk";
const kVersion = "0.2";

const kJarFile = "xkiosk.jar";
const kContentFolder = "content/xkiosk/";
const kLocaleFolders = ["locale/en-US/xkiosk/","locale/de-DE/"];
const kSkinFolder = "skin/classic/xkiosk/"; // leave blank if not applicable


var kMsg = "Do you wish to install "+kDisplayName+" to your profile?\n\nClick OK to install to your profile.\n\nClick Cancel if you want to install globally.";

initInstall(kName, kPackage, kVersion);

var chromef = getFolder("chrome");
var pchromef = getFolder("Profile", "chrome");

var existsInApp     = File.exists(getFolder(chromef,  kJarFile));
var existsInProfile = File.exists(getFolder(pchromef, kJarFile));

var instToProfile = !existsInApp && (existsInProfile || confirm(kMsg));

var folder = instToProfile ? pchromef : chromef;
var flag = instToProfile ? PROFILE_CHROME : DELAYED_CHROME;

var err = addFile(kPackage, kVersion, kJarFile, folder, null)

if(err == SUCCESS) {
  var jar = getFolder(folder, kJarFile);

  registerChrome(CONTENT | flag, jar, kContentFolder);
  for(var i = 0; i < kLocaleFolders.length; i++)
    registerChrome(LOCALE | flag, jar, kLocaleFolders[i]);
  if(kSkinFolder) registerChrome(SKIN | flag, jar, kSkinFolder);

  err = performInstall();

  if(err!=SUCCESS && err!=999) {
    alert("Install failed. Error code:" + err);
    cancelInstall(err);
  }
} else {
  alert("Failed to create " +kJarFile +"\n"
    +"You probably don't have appropriate permissions \n"
    +"(write access to firebird/chrome directory). \n"
    +"_____________________________\nError code:" + err);
  cancelInstall(err);
}