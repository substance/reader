"use strict";

var _ = require("underscore");
var Document = require("substance-document");
var Controller = require("substance-application").Controller;
var ReaderView = require("./reader_view");
var util = require("substance-util");
var DocumentSession = Document.Session;
var Container = Document.Container;
var SurfaceController = require("substance-surface").SurfaceController;

// Reader.Controller
// -----------------
//
// Controls the Reader.View

var ReaderController = function(doc, options) {

  // Private reference to the document
  this.document = doc;

  // E.g. context information
  this.options = options || {};
};

ReaderController.Prototype = function() {

  this.hasFigures = function() {
    return this.figuresCtrl && this.figuresCtrl.container.nodes.length > 0;
  };

  this.hasInfo = function() {
    return this.infoCtrl && this.infoCtrl.container.nodes.length > 0;
  };

  // Initial view creation
  // --------

  this.createView = function() {
    if (!this.view) {
      this.view = new ReaderView(this, this.options);
    }
    return this.view;
  };

  // Initial controller state
  // --------

  this.initialize = function(newState, cb) {
    var doc = this.document;

    this.currentContext = newState.contextId;

    // Reader state
    // -------

    // Note: the sub-controllers exist over the whole life-cycle of this controller
    // i.e., they are not disposed until this controller is disposed

    var nodeSurfaceProvider = new Container.DefaultNodeSurfaceProvider(doc);

    this.contentCtrl = new SurfaceController(
      new DocumentSession(new Container(doc, "content", nodeSurfaceProvider))
    );

    if (doc.get('figures')) {
      this.figuresCtrl = new SurfaceController(
        new DocumentSession(new Container(doc, "figures", nodeSurfaceProvider))
      );
    }

    if (doc.get('info')) {
      this.infoCtrl = new SurfaceController(
        new DocumentSession(new Container(doc, "info", nodeSurfaceProvider))
      );
    }

    this.referenceIndex = doc.indexes["references"] || doc.addIndex("references", {
      types: ["figure_reference", "contributor_reference", "remark_reference", "error_reference"],
      property: "target"
    });

    this.createView().render();

    cb(null);
  };


  // Triggers updateState after transition has finished
  // --------

  this.afterTransition = function(oldState) {
    if (this.view) {
      this.view.updateState(this.state, oldState);
    }
  };

  var contextMapping = {
    "figure_reference": "figures",
    "contributor_reference": "info",
    "remark_reference": "remarks",
    "error_reference": "errors"
  };

  // API used by ReaderView:
  this.getContextId = function() {
    return this.state.contextId || "toc";
  };

  this.getNodesForResource = function(resourceId) {
    var references = this.referenceIndex.get(resourceId);
    var nodes = _.map(references, function(r) {
      return r.path[0];
    });
    return nodes;
  };

};


ReaderController.Prototype.prototype = Controller.prototype;
ReaderController.prototype = new ReaderController.Prototype();

module.exports = ReaderController;
