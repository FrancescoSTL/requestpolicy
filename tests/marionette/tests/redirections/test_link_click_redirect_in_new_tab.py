# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from rp_ui_harness.testcases import RequestPolicyTestCase
from marionette_driver.marionette import Actions
from rp_puppeteer.errors import ElementNotDisplayedException
from contextlib import contextmanager
from rp_ui_harness.utils import redirections


PREF_DEFAULT_ALLOW = "extensions.requestpolicy.defaultPolicy.allow"


class TestLinkClickRedirectInNewTab(RequestPolicyTestCase):

    def setUp(self):
        super(TestLinkClickRedirectInNewTab, self).setUp()

        self.prefs.set_pref(PREF_DEFAULT_ALLOW, False)

    def tearDown(self):
        try:
            self.prefs.reset_pref(PREF_DEFAULT_ALLOW)
        finally:
            super(TestLinkClickRedirectInNewTab, self).tearDown()

    ################
    # Test Methods #
    ################

    def test_redirect_notification_appears_or_not(self):
        tabbar = self.browser.tabbar

        def test_no_appear(test_url, dest_url, info, *args):
            open_page_and_open_first_link_in_new_tab(test_url, *args)

            # Select the new tab
            tabbar.tabs[1].select()

            self.assertFalse(self.redir.is_shown(),
                             "There's no redirect notification in the "
                             "destination tab.")
            redirections.wait_until_url_load(self, dest_url)
            self.assertFalse(self.redir.is_shown(),
                             "There's no redirect notification in the "
                             "destination tab.")

            # Close the new tab.
            tabbar.close_tab()

            self.assertFalse(self.redir.is_shown(),
                             "There's no redirect notification in the "
                             "origin tab.")

        def test_appear(test_url, dest_url, info, *args):
            open_page_and_open_first_link_in_new_tab(test_url, *args)

            # Select the new tab
            tabbar.tabs[1].select()

            self.assertTrue(self.redir.is_shown(),
                            "The redirect notification has been displayed "
                            "in the destination tab.")
            redirections.assert_url_does_not_load(self, dest_url,
                expected_delay=info["delay"])

            # Close the new tab.
            tabbar.close_tab()

            self.assertFalse(self.redir.is_shown(),
                             "There's no redirect notification in the "
                             "origin tab.")

        def open_page_and_open_first_link_in_new_tab(test_url, open_tab_method):
            with self.marionette.using_context("content"):
                self.marionette.navigate(test_url)
                link = self.marionette.find_element("tag name", "a")

            if open_tab_method == "middleClick":
                with self.marionette.using_context("content"):
                    Actions(self.marionette).click(link, 1).perform()
            elif open_tab_method == "contextMenu":
                self.ctx_menu.select_entry("context-openlinkintab", link)
                # TODO: Use the "tabs" library as soon as it has been ported
                #       to Marionette, see Mozilla Bug 1121725.
                #       The mozmill code to open the link in a new tab was:
                #       ```
                #       tabBrowser.openTab({method: "contextMenu", target: link});
                #       ```

        def expand_url(path, option="page with link"):
            if option == "page with link":
                path = "link.html?" + path
            return "http://www.maindomain.test/" + path

        def test_variant(*args):
            def test(test_url, dest_url, info):
                if info["redirection_method"] == "js:document.location:<a> href":
                    # If the link URL is
                    #     javascript:document.location = 'http://www.example.com/'
                    # there should _always_ be a notification, regardless
                    # of where that came from.
                    test_appear(test_url, dest_url, info, *args)
                elif info["is_same_host"]:
                    test_no_appear(test_url, dest_url, info, *args)
                else:
                    test_appear(test_url, dest_url, info, *args)

            def maybe_test((test_url, _, dest_url), info):
                if info["redirection_method"] == "js:document.location:<a> href":
                    if info["is_relative_dest"]:
                        # Examplary relative href:
                        #     javascript:document.location = '/index.html'
                        # This works for a left-click, but not for
                        # "open in new tab". In a new tab, an absolute URI
                        # is needed.
                        return

                    # FIXME: Issue #725;  This test fails with E10s enabled.
                    #        When FxPuppeteer's `TabBar.get_handle_for_tab()` is
                    #        executed for the new tab with the test URL, the
                    #        `contentWindowAsCPOW` either is `null` or does not
                    #        have a `QueryInterface()` function.
                    if self.browser_info.e10s_enabled:
                        return

                    # The "Open Link in New Tab" context menu entry is not
                    # available for <a> elements with such hrefs containing
                    # JavaScript code.
                    if args[0] == "contextMenu":
                        with self.assertRaises(ElementNotDisplayedException):
                            test(test_url, dest_url, info)
                        return

                test(test_url, dest_url, info)

            try:
                redirections.for_each_possible_redirection_scenario(maybe_test,
                                                                    "link")
            except:
                print "test variant: " + str(args[0])
                raise

        test_variant("middleClick")
        test_variant("contextMenu")
