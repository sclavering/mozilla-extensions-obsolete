# Obsolete Extensions for Firefox/Thunderbird/Mozilla

Here is the source for various unmaintained extensions I wrote (several in collaboration with Chris Neale) for Firefox/Thunderbird/Mozilla.  Many are obsolete due to changes to the apps, and all of them would at least need the install.rdf updating.

The licence in MPLv2 unless stated otherwise.

## Almost Full Screen

Overrode View > Full Screen (and F11) to switch to "almost full screen" mode, where the titlebar and borders of the window were removed and it was resized to use all the space on the screen except for that which the Windows taskbar occupied.

## CTC

Added “Close Tab” to the context menu, below “Stop”.

## Digger

Made navigating in hierarchical websites easier by proving a quick way to get from http://example.org/foo/bar/ to http://example.org/foo/ and similar using a context menu on the Go button and/or the site icon in the location bar. It also offered similar functionality for links via the main context menu.

## Flowing Tabs

Made Firefox's tab bar wrap onto multiple rows when it became too long for a single row (back before scrolling was built in).

## Fusion

Combined the progress bar and the location bar, in the style of some versions of Safari.

Superseded by the very similar Fission, by a different author.

## Go Home

Added “Home” to the main context menu, immediately below “Stop”.

## Go To

Provided just the context-menu functionality of Digger, prior to it being merged into it.

## Go Up

Provideded a toolbar button to go “up” a level in a site.

## Link It

Scanned links (<a> elements) in web pages you visit to generate Prev/Next/etc. <link>s for use by older versions of the Link Toolbar that did not have this functionality built in.

## Link Toolbar / Link Widgets

Made navigating sites easier by providing buttons to go to the First, Next, Previous or Last pages in a sequence (useful for webcomics and multi-page news articles, amongst others); up a level in the site; and to the top of the site. The links were either guessed from the URL, extracted from the text of the page, or supplied by the page author using the <link> tag.

Link Toolbar is the older version of this extension that occupied a whole toolbar, rather than being a movable toolbar item added via the usual toolbar customisation in Firefox.

## Lock Tab

A trivial extension that just stopped you closing a tab (until unlocked).  This could be helpful on video sites on slower internet connections as it prevented you from accidentally losing all the already-fetched video.

## Menu Tweaker

Allowed you to customise the menus in really early versions of Firefox.

## Nav Buttons

Variant on Link Widgets where each button was a separate toolbar item, rather than them all being one item together.

## No Go

Hid the Go menu.  This was helpful (back when browser history was stored in a Mork database) for those with a large history file, as otherwise opening it for the first time would lock the UI for a long time (minutes, easily).

## Pref Buttons

Added various extra toolbar buttons to control preferences.  Derived from Aaron Andersen's PrefBar extension.

## Scroll Tabs 

Made Firefox's tab-bar scrollable, back before this was a built-in feature.

## Status Buttons

Let you drag toolbar buttons to the status bar.

## Stop/Reload

Provided a combined Stop/Reload toolbar button.

## Tab Bin

Added a toolbar button (labelled “Closed Tabs”) that let you retrieve the five most-recently closed tabs via a pull-down menu.  The menu listed the titles of the pages the tabs were last showing (or the URLs, for pages without titles) for easy identification.  (This was prior to Firefox having a Recently Closed Tabs feature built in.)

The extension worked by keeping up to five tabs hidden rather than properly closed, so restoring is instantaneous, but videos and audio do continue playing.

## Tab X

Made the close buttons on tabs always visible.

## Toolbar Enhancements

Made it possible to have customisable toolbars on the top, bottom and both sides of the browser window, and below the tab-bar (back in the days when tabs normally went below the tab-bar), and also to add buttons to each end of the tab-bar and status-bar.

Also added many more toolbar buttons for actions normally available through the menus, and for some hidden functions in Firefox like disabling images in the current tab.

## Unhistoric

Removed the middle part of the History menu (the list of 10 recently-visited pages).  This was helpful (back when browser history was stored in a Mork database) for those with a large history file, as otherwise opening the History menu (for the first time each time Firefox is run) can lock the UI for a long time (minutes, easily).

## x / xKiosk

x and xKiosk provided toolbar buttons for clearing the browser history, form info, saved passwords, download history etc, and were available for Firefox 1.0 only. The Tools > Clear Private Data... function in Firefox 1.5 and above makes them obsolete (and there are various extensions that provide a toolbar button to reach that function).

## Zoomy

Provided toolbar buttons to adjust the size of the text in the current tab.
