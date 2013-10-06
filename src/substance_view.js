"use strict";

var _ = require("underscore");
var util = require('substance-util');
var html = util.html;
var View = require("substance-application").View;
var $$ = require("substance-application").$$;


// Substance.View Constructor
// ========
// 

var SubstanceView = function(controller) {
  View.call(this);

  this.controller = controller;
  this.$el.attr({id: "container"});

  // Handle state transitions
  // --------
  
  this.listenTo(this.controller, 'state-changed', this.onStateChanged);
  this.listenTo(this.controller, 'loading:started', this.displayLoadingIndicator);

};

SubstanceView.Prototype = function() {

  this.displayLoadingIndicator = function(msg) {
    this.$('#main').empty();
    this.$('.loading').html(msg).show();
  };

  // Session Event handlers
  // --------
  //

  this.onStateChanged = function() {
    var state = this.controller.state;
    if (state.context === "reader") {
      this.openReader();
    } else {
      console.log("Unknown application state: " + state);
    }
  };

  // Open the reader view
  // ----------
  //

  this.openReader = function() {
    var view = this.controller.reader.createView();
    this.replaceMainView('reader', view);

    var doc = this.controller.reader.__document;
    
    // Hide loading indicator
    this.$('.loading').hide();
  };

  // Rendering
  // ==========================================================================
  //

  this.replaceMainView = function(name, view) {
    $('body').removeClass().addClass('current-view '+name);

    if (this.mainView && this.mainView !== view) {
      this.mainView.dispose();
    }

    this.mainView = view;
    this.$('#main').html(view.render().el);
  };

  this.render = function() {
    this.el.innerHTML = "";

    // Browser not supported dialogue
    // ------------

    this.el.appendChild($$('.browser-not-supported', {
      text: "Sorry, your browser is not supported.",
      style: "display: none;"
    }));

    // About Substance
    // ------------

    // this.el.appendChild($$('a.about-substance', {
    //   href: "http://substance.io",
    //   html: 'Substance 0.5.0'
    // }));

    // Loading indicator
    // ------------

    this.el.appendChild($$('.loading', {
      style: "display: none;"
    }));

    // Main panel
    // ------------

    this.el.appendChild($$('#main'));
    return this;
  };

  this.dispose = function() {
    this.stopListening();
    if (this.mainView) this.mainView.dispose();
  };
};


// Export
// --------

SubstanceView.Prototype.prototype = View.prototype;
SubstanceView.prototype = new SubstanceView.Prototype();

module.exports = SubstanceView;