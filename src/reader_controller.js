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
    return this.figuresCtrl;
  };

  this.hasInfo = function() {
    return this.infoCtrl;
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


  // Implements state transitions for the viewer
  // --------
  // 
  // We use default implementation for now

  // this.transition = function(newState, cb) {
  //   // handle reflexiv transitions
  //   if (newState.id === this.state.id) {
  //     var skipTransition = false;

  //     switch (newState.id) {
  //     case "main":
  //       skipTransition = (newState.contextId === this.state.contextId && newState.resourceId === this.state.resourceId && newState.nodeId === this.state.nodeId);
  //       break;
  //     }

  //     if (skipTransition) return cb(null);
  //   }

  //   cb(null);
  // };

  this.afterTransition = function(oldState) {
    if (this.view) {
      this.view.updateState(this.state, oldState);
    }
  };

  var contextMapping = {
    "figure_reference": "figures",
    "person_reference": "info",
    "remark_reference": "remarks",
    "error_reference": "errors"
  };

  // API used by ReaderView:
  this.getContextId = function() {
    return this.state.contextId || "toc";
  };

  this.getResourceReferenceContainers = function(resourceId) {
    // A reference is an annotation node. We want to highlight
    // all (top-level) nodes that contain a reference to the currently activated resource
    // For that we take all references pointing to the resource
    // and find the root of the node on which the annotation sticks on.
    var references = this.referenceIndex.get(resourceId);
    var container = this.contentCtrl.session.container;
    var nodes = _.uniq(_.map(references, function(ref) {
      return container.lookupRootNode(ref.path[0]);
    }));
    return nodes;
  };

};


ReaderController.Prototype.prototype = Controller.prototype;
ReaderController.prototype = new ReaderController.Prototype();

module.exports = ReaderController;
