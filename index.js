/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const { WindowTracker } = require("sdk/deprecated/window-utils");
const { ignoreWindow } = require("sdk/private-browsing/utils");
const { prefs } = require("sdk/simple-prefs");
const tabs = require("sdk/tabs");

const PLACES_URL = "chrome://browser/content/places/places.xul";

// maps window => cached original method (called if the extension is disabled).
// keeps a weak reference to the windows to allow them to be GC-ed when closed.
// the WeakMap objects are lazy-loaded and can not be overwritten (no setters).
const methodCache = {
    get showPlacesOrganizer() {
        delete methodCache.showPlacesOrganizer;
        return methodCache.showPlacesOrganizer = new WeakMap();
    },
    get BrowserDownloadsUI() {
        delete methodCache.BrowserDownloadsUI;
        return methodCache.BrowserDownloadsUI = new WeakMap();
    },
};

// opens the places.xul page and focuses the selected left pane container.
const openPlace = function (aHierarchy) {
    const contentScript = `PlacesOrganizer.selectLeftPaneContainerByHierarchy("${aHierarchy}");`;
    const activatePlace = (tab) => void tab.attach({ contentScript });

    if (!prefs.allow_duplicate_places_tabs) {
        const existingPlacesTab = Array.from(tabs).find(tab => tab.url.startsWith(PLACES_URL));

        if (existingPlacesTab) {
            existingPlacesTab.activate();
            activatePlace(existingPlacesTab);

            return;
        }
    }

    tabs.open({ url: PLACES_URL, onLoad: activatePlace });
};

// handles new windows as they are encountered.
// replaces the PlacesCommandHook.showPlacesOrganizer() and window.BrowserDownloadsUI() methods.
const onTrack = function onTrack(window) {
    if (!window || ignoreWindow(window)) {
        return;
    }

    if (window.PlacesCommandHook && window.PlacesCommandHook.showPlacesOrganizer) {
        const oldShowPlacesOrganizer = window.PlacesCommandHook.showPlacesOrganizer;
        methodCache.showPlacesOrganizer.set(window, oldShowPlacesOrganizer);

        window.PlacesCommandHook.showPlacesOrganizer = function PCH_showPlacesOrganizer(aLeftPaneRoot) {
            if ((aLeftPaneRoot === "Downloads" && prefs.open_downloads_in_tab) ||
                (aLeftPaneRoot === "History" && prefs.open_history_in_tab) ||
                (aLeftPaneRoot === "AllBookmarks" && prefs.open_bookmarks_in_tab) ||
                (aLeftPaneRoot === "BookmarksMenu" && prefs.open_bookmarks_in_tab) ||
                (aLeftPaneRoot === "BookmarksToolbar" && prefs.open_bookmarks_in_tab) ||
                (aLeftPaneRoot === "UnfiledBookmarks" && prefs.open_bookmarks_in_tab))
            {
                openPlace(aLeftPaneRoot);
            } else {
                oldShowPlacesOrganizer.apply(this, arguments);
            }
        };
    }

    if (window.BrowserDownloadsUI) {
        const oldBrowserDownloadsUI = window.BrowserDownloadsUI;
        methodCache.BrowserDownloadsUI.set(window, oldBrowserDownloadsUI);

        window.BrowserDownloadsUI = function BrowserDownloadsUI() {
            if (prefs.open_downloads_in_tab) {
                openPlace("Downloads");
            } else {
                oldBrowserDownloadsUI.apply(this, arguments);
            }
        };
    }
};

// handles windows as they are closed.
const onUntrack = function onUntrack(window) {
    if (!window || ignoreWindow(window)) {
        return;
    }

    if (window.PlacesCommandHook && methodCache.showPlacesOrganizer.has(window)) {
        window.PlacesCommandHook.showPlacesOrganizer = methodCache.showPlacesOrganizer.get(window);
        methodCache.showPlacesOrganizer.delete(window);
    }

    if (window.BrowserDownloadsUI && methodCache.BrowserDownloadsUI.has(window)) {
        window.BrowserDownloadsUI = methodCache.BrowserDownloadsUI.get(window);
        methodCache.BrowserDownloadsUI.delete(window);
    }
};

exports.main = function (options, callbacks) {
    WindowTracker({ onTrack, onUntrack });
};

exports.onUnload = function (reason) {
    // the `WindowTracker` and `tabs` modules
    // already handle all unloading duties.
};
