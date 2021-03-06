/* global window, document, $, common, WinEnv, elManager */

(function() {
  /* global Components */
  const {utils: Cu} = Components;

  var {Services} = Cu.import("resource://gre/modules/Services.jsm", {});

  var {ScriptLoader: {importModule}} = Cu.import(
      "chrome://rpcontinued/content/lib/script-loader.jsm", {});
  var {Logger} = importModule("lib/logger");
  var {SUBSCRIPTION_ADDED_TOPIC, SUBSCRIPTION_REMOVED_TOPIC} =
      importModule("lib/subscription");
  var {rpService} = importModule("main/requestpolicy-service");

  //============================================================================

  var PAGE_STRINGS = [
    "yourPolicy",
    "defaultPolicy",
    "subscriptions",
    "subscriptionPolicies",
    "subscriptionPoliciesDefinition",
    "learnMoreAboutSubscriptions",
    "usability",
    "privacy",
    "browser",
    "subscriptionDenyTrackersDescription",
    "subscriptionAllowSameOrgDescription",
    "subscriptionAllowFunctionalityDescription",
    "subscriptionAllowEmbeddedDescription",
    "subscriptionAllowMozillaDescription",
    "subscriptionAllowExtensionsDescription"
  ];

  $(function() {
    common.localize(PAGE_STRINGS);
  });

  function getInputElement(subName) {
    var elements = document.body.querySelectorAll(
        "input[name=" + subName + "]");
    if (elements.length <= 0) {
      return null;
    }
    return elements[0];
  }

  function getAllSubscriptionElements() {
    var divs = document.getElementsByClassName("subscription");
    var elements = [];
    for (var i = 0, len = divs.length; i < len; ++i) {
      var div = divs[i];
      elements.push({
          id: div.id,
          div: div,
          input: getInputElement(div.id)});
    }
    return elements;
  }

  function updateDisplay() {
    var userSubs = rpService.getSubscriptions();
    var subsInfo = userSubs.getSubscriptionInfo();
    var allSubElements = getAllSubscriptionElements();
    for (var i = 0, len = allSubElements.length; i < len; ++i) {
      var element = allSubElements[i];
      element.input.checked = element.id in subsInfo.official;
    }
  }

  function handleSubscriptionCheckboxChange(event) {
    var userSubs = rpService.getSubscriptions();

    var subName = event.target.name;
    var enabled = event.target.checked;
    var subInfo = {};
    subInfo.official = {};
    subInfo.official[subName] = true;
    if (enabled) {
      userSubs.addSubscription("official", subName);
      Services.obs.notifyObservers(null, SUBSCRIPTION_ADDED_TOPIC,
            JSON.stringify(subInfo));
    } else {
      userSubs.removeSubscription("official", subName);
      Services.obs.notifyObservers(null, SUBSCRIPTION_REMOVED_TOPIC,
            JSON.stringify(subInfo));
    }
  }

  window.onload = function() {
    updateDisplay();

    var available = {
      "allow_embedded": {},
      "allow_extensions": {},
      "allow_functionality": {},
      "allow_mozilla": {},
      "allow_sameorg": {},
      "deny_trackers": {}
    };
    for (var subName in available) {
      var el = getInputElement(subName);
      if (!el) {
        Logger.dump("Skipping unexpected official subName: " + subName);
        continue;
      }
      elManager.addListener(el, "change", handleSubscriptionCheckboxChange);
    }

    // call updateDisplay() every time a subscription is added or removed
    WinEnv.obMan.observe([
      SUBSCRIPTION_ADDED_TOPIC,
      SUBSCRIPTION_REMOVED_TOPIC
    ], updateDisplay);
  };

}());
