# moz-places-in-tabs
Makes Firefox open places pages (Bookmarks, Downloads, History) in tabs instead of new windows.

![](https://img.shields.io/amo/d/places-in-tabs.svg?style=plastic)

## Reference
- [PlacesUIUtils.jsm](https://git.io/vybBP) - contains the list of valid left pane container hierarchies used by PlacesOrganizer.
- [browser-places.js](https://git.io/vybWt) - contains the original `PlacesCommandHook.showPlacesOrganizer()` method.
- [browser.js](https://git.io/vybWk) - contains the original `BrowserDownloadsUI()` method.

---

This will not be available as a WebExtension because "In Firefox, you can't open (using tabs.create), or navigate to (using tabs.update) privileged URLs" (see [tabs](https://mzl.la/2nsZ7UD)).
