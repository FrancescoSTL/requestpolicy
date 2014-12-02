PAGE_STRINGS = [
  'welcomeToRequestPolicy',
  'forMostUsersDefaultsAreIdeal',
  'youCanConfigureRequestPolicyToBeMoreStrict',
  'teachMeHowToUseRequestPolicy',
  'returnToBrowsing',
  'configureRequestPolicy',
  'defaultPolicy',
  'defaultPolicyDefinition',
  'allowRequestsByDefault',
  'blockRequestsByDefault',
  'allowRequestsToTheSameDomain',
  'subscriptionPolicies',
  'subscriptionPoliciesDefinition',
  'yesUseSubscriptions',
  'noDoNotUseSubscriptions'
];

$(function () {
  common.localize(PAGE_STRINGS);
});

Cu.import("resource://gre/modules/Services.jsm");

function showConfigure() {
  $('#welcome').css('display', 'none');
  $('#configure').css('display', 'block');
}

function handleDefaultPolicyChange() {
  Prefs.prefs.setBoolPref('defaultPolicy.allow',
      $('#defaultallow').prop('checked'));
  Services.prefs.savePrefFile(null);
  setAllowSameDomainBlockDisplay();
  handleSubscriptionsChange();
}

function handleAllowSameDomainChange() {
  Prefs.prefs.setBoolPref('defaultPolicy.allowSameDomain',
      $('#allowsamedomain').prop('checked'));
  Services.prefs.savePrefFile(null);
}

function setAllowSameDomainBlockDisplay() {
  if ($('#defaultallow').prop('checked')) {
    $('#allowsamedomainblock').css('display', 'none');
  } else {
    $('#allowsamedomainblock').css('display', 'block');
  }
}

function handleSubscriptionsChange() {
  var enableSubs = $('#enablesubs').prop('checked');
  var enableAllowSubs = enableSubs && $('#defaultdeny').prop('checked');
  var enableDenySubs = enableSubs && $('#defaultallow').prop('checked');
  var subs = {
    'allow_embedded':{},
    'allow_extensions':{},
    'allow_functionality':{},
    'allow_mozilla':{},
    'allow_sameorg':{},
    'deny_trackers':{}
  };
  var userSubs = Prefs.getSubscriptions();
  for (var subName in subs) {
    var subInfo = {};
    subInfo['official'] = {};
    subInfo['official'][subName] = true;
    if (enableAllowSubs && subName.indexOf('allow_') == 0 ||
        enableDenySubs && subName.indexOf('deny_') == 0) {
      userSubs.addSubscription('official', subName);
      observerService.notifyObservers(null, SUBSCRIPTION_ADDED_TOPIC,
          JSON.stringify(subInfo));
    } else {
      userSubs.removeSubscription('official', subName);
      observerService.notifyObservers(null, SUBSCRIPTION_REMOVED_TOPIC,
          JSON.stringify(subInfo));
    }
  }
}

function onload() {
  // Populate the form values based on the user's current settings.
  // If the use has just upgrade from an 0.x version, populate based on the old
  // preferences and also do a rule import based on the old strictness settings.
  // Note: using version 1.0.0a8 instead of 1.0 as that was the last version
  // before this setup window was added.
  if (Services.vc.compare(Utils.info.lastRPVersion, '0.0') > 0 &&
      Services.vc.compare(Utils.info.lastRPVersion, '1.0.0a8') <= 0) {
    if (Prefs.prefs.prefHasUserValue('uriIdentificationLevel')) {
      var identLevel = Prefs.prefs.getIntPref('uriIdentificationLevel');
    } else {
      var identLevel = 1;
    }
    $('#defaultdeny').prop('checked', true);
    $('#allowsamedomainblock').css('display', 'block');
    $('#allowsamedomain').prop('checked', identLevel == 1);

    // If the user doesn't have any new-style rules, automatically do an import
    // of the old rules. We check for new-style rules just in case the user has
    // opened the setup window again after initial upgrade.
    try {
      var ruleCount = PolicyManager.getUserRuleCount();
    } catch (e) {
      Logger.warning(Logger.TYPE_INTERNAL, 'Unable to get new rule count: ' + e);
      ruleCount = -1;
    }
    Logger.dump('Rule count: ' + ruleCount);
    if (ruleCount <= 0) {
      Logger.dump('Performing rule import.');
      var addHostWildcard = identLevel == 1;
      var rules = common.getOldRulesAsNewRules(addHostWildcard);
      common.addAllowRules(rules);
    }

    // Skip the welcome screen.
    showConfigure();
  } else {
    var defaultAllow = Prefs.prefs.getBoolPref('defaultPolicy.allow');
    $('#defaultallow').prop('checked', defaultAllow);
    $('#defaultdeny').prop('checked', !defaultAllow);
    if (!defaultAllow) {
      $('#allowsamedomainblock').css('display', 'block');
    }
    $('#allowsamedomain').prop('checked',
        Prefs.prefs.getBoolPref('defaultPolicy.allowSameDomain'));
    // Subscriptions are only simple here if we assume the user won't open the
    // setup window again after changing their individual subscriptions through
    // the preferences. So, let's assume that as the worst case is that the setup
    // page shows such a setup-page-revisiting user the subscriptions as being
    // enabled when they really aren't.
  }

  $('#showconfigure').click(showConfigure);
  $('input[name=defaultpolicy]').change(handleDefaultPolicyChange);
  $('input[name=subscriptions]').change(handleSubscriptionsChange);
  $('#allowsamedomain').change(handleAllowSameDomainChange);
}
