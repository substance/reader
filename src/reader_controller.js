"use strict";

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

  // this.state = state;

  // // Current explicitly set context
  // this.currentContext = "toc";

};

ReaderController.Prototype = function() {

  this.hasFigures = function() {
    return this.figuresCtrl;
  };

  this.hasInfo = function() {
    return this.infoCtrl;
  };

  this.createView = function() {
    if (!this.view) {
      this.view = new ReaderView(this, this.options);
    }
    return this.view;
  };


  this.initialize = function(newState, cb) {
    var doc = this.document;

    this.lastContext = "toc";

    // Needed?
    // this.annotator = new RichtextAnnotator();

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

  // this.transition = function(newState, cb) {

  //   // handle reflexiv transitions
  //   if (newState.id === this.state.id) {
  //     var skipTransition = false;

  //     switch (newState.id) {
  //     case "main":
  //       skipTransition = (newState.contextId === this.state.contextId && newState.resourceId === this.state.resourceId && newState.nodeId === this.state.nodeId);
  //       break;
  //     case "focus":
  //       skipTransition = true;
  //       break;
  //     }

  //     if (skipTransition) return cb(null);
  //   }

  //   if (this.state.id === "focus") {
  //     this.disposeChildController();
  //     this.focusCtrl = null;
  //   }

  //   switch (newState.id) {
  //   case "focus":
  //     this.focusCtrl = new FocusController(this.document);
  //     this.setChildController(this.focusCtrl);
  //     break;
  //   }

  //   cb(null);
  // };

  // API used by WriterView:
  this.getContextId = function() {
    return this.state.contextId || "toc";
  };


};


ReaderController.Prototype.prototype = Controller.prototype;
ReaderController.prototype = new ReaderController.Prototype();

module.exports = ReaderController;
