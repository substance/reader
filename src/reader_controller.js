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

var ReaderController = function(doc, state, options) {

  // Private reference to the document
  this.__document = doc;

  // E.g. context information
  this.options = options || {};

  // Reader state
  // -------

  var nodeSurfaceProvider = new Container.DefaultNodeSurfaceProvider(doc);

  this.contentCtrl = new SurfaceController(
    new DocumentSession(new Container(doc, "content", nodeSurfaceProvider))
  );

  if (doc.get('figures')) {
    // this.figures = new Document.Controller(doc, {view: "figures"});
    // this.figuresCtrl = new DocumentSession(new Container(doc, "figures", nodeSurfaceProvider));
    this.figuresCtrl = new SurfaceController(
      new DocumentSession(new Container(doc, "figures", nodeSurfaceProvider))
    );
  }

  // if (doc.get('citations')) {
  //   this.figures = new DocumentSession(new Container(doc, "figures", nodeSurfaceProvider));
  //   this.citations = new Document.Controller(doc, {view: "citations"});
  // }

  if (doc.get('info')) {
    this.infoCtrl = new SurfaceController(
      new DocumentSession(new Container(doc, "info", nodeSurfaceProvider))
    );

    // this.infoCtrl = new DocumentSession(new Container(doc, "info", nodeSurfaceProvider));
    // this.info = new Document.Controller(doc, {view: "info"});
  }

  this.state = state;

  // Current explicitly set context
  this.currentContext = "toc";

};

ReaderController.Prototype = function() {

  this.hasFigures = function() {
    return this.figuresCtrl;
  };

  this.hasInfo = function() {
    return this.infoCtrl;
  };

  this.createView = function() {
    if (!this.view) this.view = new ReaderView(this);
    return this.view;
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

  // Explicit context switch
  // --------
  // 

  this.switchContext = function(context) {
    // Remember scrollpos of previous context
    this.currentContext = context;

    this.modifyState({
      context: context,
      node: null,
      resource: null
    });
  };

  this.modifyState = function(state) {
    Controller.prototype.modifyState.call(this, state);
  };

  // TODO: Transition to ao new solid API
  // --------
  // 

  this.getActiveControllers = function() {
    var result = [];
    result.push(["article", this]);
    result.push(["reader", this.content]);
    return result;
  };
};


ReaderController.Prototype.prototype = Controller.prototype;
ReaderController.prototype = new ReaderController.Prototype();

module.exports = ReaderController;
