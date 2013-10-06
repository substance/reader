"use strict";

var _ = require("underscore");
var Application = require("substance-application");
var SubstanceController = require("./substance_controller");
var SubstanceView = require("./substance_view");
var util = require("substance-util");
var html = util.html;


var ROUTES = [
  {
    "route": ":context/:node/:resource/:fullscreen",
    "name": "document-resource",
    "command": "openReader"
  },
  {
    "route": ":context/:node/:resource",
    "name": "document-resource",
    "command": "openReader"
  },
  {
    "route": ":context/:node/:resource",
    "name": "document-resource",
    "command": "openReader"
  },
  {
    "route": ":context/:node",
    "name": "document-node", 
    "command": "openReader"
  },
  {
    "route": ":context",
    "name": "document-context",
    "command": "openReader"
  },
  {
    "route": "",
    "name": "document",
    "command": "openReader"
  }
];


// The Substance Reader Application
// ========
//

var Substance = function(config) {
  config = config || {};
  config.routes = ROUTES;
  Application.call(this, config);

  this.controller = new SubstanceController(config);
};

Substance.Reader = require("lens-reader");
Substance.Outline = require("lens-outline");


Substance.Prototype = function() {

  // Start listening to routes
  // --------

  this.render = function() {
    this.view = this.controller.createView();
    this.$el.html(this.view.render().el);
  }
};


Substance.Prototype.prototype = Application.prototype;
Substance.prototype = new Substance.Prototype();
Substance.prototype.constructor = Substance;


module.exports = Substance;
