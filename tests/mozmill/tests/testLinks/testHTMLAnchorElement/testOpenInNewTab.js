/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var rpRootDir = "../../../";
var rpConst = require(rpRootDir + "lib/constants");
var rootDir = rpRootDir + rpConst.mozmillTestsRootDir;

var {assert, expect} = require(rootDir + "lib/assertions");
var prefs = require(rootDir + "lib/prefs");
var tabs = require(rootDir + "firefox/lib/tabs");
var utils = require(rootDir + "lib/utils");

var rpUtils = require(rpRootDir + "lib/rp-utils");

const TEST_URL = "http://www.maindomain.test/link_1.html";


var setupModule = function(aModule) {
  aModule.controller = mozmill.getBrowserController();

  aModule.tabBrowser = new tabs.tabBrowser(aModule.controller);
  aModule.tabBrowser.closeAllTabs();

  prefs.setPref(rpConst.PREF_DEFAULT_ALLOW, false);
}

var teardownModule = function(aModule) {
  prefs.clearUserPref(rpConst.PREF_DEFAULT_ALLOW);
  utils.closeContentAreaContextMenu(aModule.controller);
  aModule.tabBrowser.closeAllTabs();
}


var testOpenInNewTab = function() {
  controller.open(TEST_URL);
  controller.waitForPageLoad();

  let link = rpUtils.getLink(controller);
  let linkURL = link.getNode().href;

  let i = 1;
  while (true === openNextTab(i, link)) {
    // Check that i+1 tabs are open
    assert.waitFor(function () {
      return tabBrowser.length === (i + 1);
    }, "Tab " + (i + 1) + " opened.");
    ++i;
  }

  assertCorrectLocations(linkURL);
  assertNoRedirects();
}



/**
 * Opens the next tab.
 * @return {boolean}
 *         true if a new tab has been opened.
 *         false if no tab needs to open anymore.
 */
var openNextTab = function(i, link) {
  switch (i) {
    case 1:
      // Open another tab by middle-clicking on the link
      tabBrowser.openTab({method: "middleClick", target: link});
      return true;
      break;

    case 2:
      // Open link via context menu in a new tab:
      tabBrowser.openTab({method: "contextMenu", target: link});
      return true;
      break;

    default:
      return false;
      break;
  }
}

var assertCorrectLocations = function(linkURL) {
  for (let index = 1; index < tabBrowser.length; ++index) {
    tabBrowser.selectedIndex = index;
    assert.equal(controller.tabs.activeTab.location.href, linkURL,
        "The location in the new tab is correct.");
  }
}


/**
 * Assert that the link clicks have not been detected as redirects.
 */
var assertNoRedirects = function() {
  for (let index = 0; index < tabBrowser.length; ++index) {
    var panel = tabBrowser.getTabPanelElement(index,
        '/{"value":"' + rpConst.REDIRECT_NOTIFICATION_VALUE + '"}');
    assert.ok(false === panel.exists(),
        "Following the link didn't cause a redirect");
  }
}
