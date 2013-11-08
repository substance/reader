"use strict";

var _ = require("underscore");
var util = require("substance-util");
var Controller = require("substance-application").Controller;
var SubstanceView = require("./substance_view");
var ReaderController = require("./reader_controller");
var Article = require("substance-article");


// Substance.Controller
// -----------------
//
// Main Application Controller for the Substance reading environment

var SubstanceController = function(config) {
  Controller.call(this);

  this.config = config;

  // Main controls
  this.on('open:reader', this.openReader);
};

SubstanceController.Prototype = function() {

  // Initial view creation
  // ===================================

  this.createView = function() {
    var view = new SubstanceView(this);
    this.view = view;
    return view;
  };

  // Update URL Fragment
  // -------
  // 
  // This will be obsolete once we have a proper router vs app state 
  // integration.

  this.updatePath = function(state) {
    var path = [];

    path.push(state.context);

    if (state.node) {
      path.push(state.node);
    } else {
      path.push('all');
    }

    if (state.resource) {
      path.push(state.resource);
    }

    if (state.fullscreen) {
      path.push('fullscreen');
    }

    window.app.router.navigate(path.join('/'), {
      trigger: false,
      replace: false
    });
  };

  this.createReader = function(doc, state) {
    var that = this;

    // Create new reader controller instance
    this.reader = new ReaderController(doc, state);

    this.reader.on('state-changed', function() {
      that.updatePath(that.reader.state);
    });

    this.modifyState({
      context: 'reader'
    });
  };

  this.openReader = function(context, node, resource, fullscreen) {
    var that = this;

    // The article view state
    var state = {
      context: context || "toc",
      node: node,
      resource: resource,
      fullscreen: !!fullscreen
    };

    this.trigger("loading:started", "Loading document ...");

    $.get(this.config.document_url)
    .done(function(data) {
      var doc, err;
      if(typeof data == 'string') data = $.parseJSON(data);
      doc = Article.fromSnapshot(data);
      that.createReader(doc, state);
    })
    .fail(function(err) {
      console.error(err);
    });
  };

  // Provides an array of (context, controller) tuples that describe the
  // current state of responsibilities
  // --------
  //

  this.getActiveControllers = function() {
    var result = [["substance", this]];
    result.push(["reader", this.reader]);
    return result;
  };
};


// Exports
// --------

SubstanceController.Prototype.prototype = Controller.prototype;
SubstanceController.prototype = new SubstanceController.Prototype();
_.extend(SubstanceController.prototype, util.Events);

module.exports = SubstanceController;
