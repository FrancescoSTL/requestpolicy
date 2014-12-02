/*
 * ***** BEGIN LICENSE BLOCK *****
 *
 * RequestPolicy - A Firefox extension for control over cross-site requests.
 * Copyright (c) 2008-2012 Justin Samuel
 * Copyright (c) 2014 Martin Kimmerle
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * ***** END LICENSE BLOCK *****
 */

if (!window.requestpolicy) {
  window.requestpolicy = {};
}

window.requestpolicy.requestLogTreeView = (function () {

  const Ci = Components.interfaces;
  const Cc = Components.classes;
  const Cu = Components.utils;

  Cu.import("chrome://requestpolicy/content/lib/script-loader.jsm");
  ScriptLoader.importModules(["utils"], this);



  let self = {

    _treebox : null,

    _emptyMessageDisplayed : true,

    _visibleData : [],

    _columnNameToIndexMap : {
      "requestpolicy-requestLog-origin" : 0,
      "requestpolicy-requestLog-destination" : 1,
      "requestpolicy-requestLog-blocked" : 2,
      "requestpolicy-requestLog-time" : 3
    },

    _aserv : Components.classes["@mozilla.org/atom-service;1"]
        .getService(Components.interfaces.nsIAtomService),

    init : function(e) {
      var message = Utils.strbundle.GetStringFromName("requestLogIsEmpty");
      var directions = Utils.strbundle
          .GetStringFromName("requestLogDirections");
      this._visibleData.push([message, directions, false, ""]);
    },

    clear : function(e) {
      var count = this.rowCount;
      if (count == 0) {
        return;
      }
      this._visibleData = [];
      if (!this._treebox) {
        return;
      }
      this._treebox.rowCountChanged(0, -count);
    },

    addAllowedRequest : function(originUri, destUri) {
      if (this._emptyMessageDisplayed) {
        // If this were to be called in a multithreaded manner, there's probably
        // a race condition here.
        this._visibleData.shift();
        this._emptyMessageDisplayed = false;
        this._treebox.rowCountChanged(0, -1);
      }
      this._visibleData.push([
        originUri,
        destUri,
        false,
        (new Date()).toLocaleTimeString()
      ]);
      if (!this._treebox) {
        return;
      }
      this._treebox.rowCountChanged(0, 1);
    },

    addBlockedRequest : function(originUri, destUri) {
      if (this._emptyMessageDisplayed) {
        // If this were to be called in a multithreaded manner, there's probably
        // a race condition here.
        this._visibleData.shift();
        this._emptyMessageDisplayed = false;
        this._treebox.rowCountChanged(0, -1);
      }
      this._visibleData.push([
        originUri,
        destUri,
        true,
        (new Date()).toLocaleTimeString()
      ]);
      if (!this._treebox) {
        return;
      }
      this._treebox.rowCountChanged(0, 1);
    },

    _getVisibleItemAtIndex : function(index) {
      return this._visibleData[this._visibleData.length - index - 1];
    },

    // Start of interface.
    // see https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Tutorial/Custom_Tree_Views

    /**
     * "This property should be set to the total number of rows in the tree."
     * (getter function)
     */
    get rowCount () {
      return this._visibleData.length;
    },

    /**
     * "This method should return the text contents at the specified row and
     * column."
     */
    setTree : function(_treebox) {
      this._treebox = _treebox;
    },

    /**
     * This method is called once to set the tree element on the view.
     */
    getCellText : function(index, column) {
      // Row 0 is actually the last element in the array so that we don't have to
      // unshift() the array and can just push().
      // TODO: Do an actual speed test with push vs. unshift to see if it matters
      // with this javascript array implementation, though I'm assuming it does.
      var columnIndex = this._columnNameToIndexMap[column.id];
      if (columnIndex != 2) {
        return this._getVisibleItemAtIndex(index)[this._columnNameToIndexMap[column.id]];
      }
    },

    isContainer : function(index) {
      return false;
    },

    isContainerOpen : function(index) {
      return false;
    },

    isContainerEmpty : function(index) {
      return false;
    },

    isSeparator : function(index) {
      return false;
    },

    isSorted : function() {
      return false;
    },

    isEditable : function(index, column) {
      return false;
    },

    getParentIndex : function(index) {
      return -1;
    },

    getLevel : function(index) {
      return 0;
    },

    hasNextSibling : function(index, after) {
      return false;
    },

    toggleOpenState : function(index) {
    },

    getImageSrc : function(index, column) {
      if (this._columnNameToIndexMap[column.id] == 2) {
        if (this._getVisibleItemAtIndex(index)[2]) {
          return "chrome://requestpolicy/skin/dot.png";
        }
      }
    },

    getProgressMode : function(index, column) {
    },

    getCellValue : function(index, column) {
    },

    cycleHeader : function(col, elem) {
    },

    selectionChanged : function() {
    },

    cycleCell : function(index, column) {
    },

    performAction : function(action) {
    },

    performActionOnCell : function(action, index, column) {
    },

    getRowProperties : function(index, props) {
      var returnValue = (this._getVisibleItemAtIndex(index)[2]) ? "blocked" : "allowed";

      if (props) {
        // Gecko version < 22
        props.AppendElement(this._aserv.getAtom(returnValue));
      } else {
        // Gecko version >= 22
        return returnValue;
      }
    },

    getCellProperties : function(index, column, props) {
      if (this._columnNameToIndexMap[column.id] == 2) {
        if (this._getVisibleItemAtIndex(index)[2]) {
          if (props) {
            // Gecko version < 22
            props.AppendElement(this._aserv.getAtom("blocked"));
          } else {
            // Gecko version >= 22
            return "blocked";
          }
        }
      }
    },

    getColumnProperties : function(column, props) {
      if (!props) {
        return "";
      }
    }

  };
  return self;
}());

// Initialize when the window DOM is loaded.
addEventListener("load", function(event) {
    window.requestpolicy.requestLogTreeView.init();
}, false);
