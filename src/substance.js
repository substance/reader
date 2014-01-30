"use strict";

var _ = require("underscore");
var Application = require("substance-application");
var $$ = Application.$$;

var ReaderController = require("./reader_controller");
var Article = require("substance-article");
var SubstanceRouter = require("./substance_router");
var Keyboard = require("substance-commander").Keyboard;
var util = require("substance-util");
var html = util.html;


// The Substance Application
// ========
//

var Substance = function(opts) {
  Application.call(this, opts);

  this.doc = Article.fromSnapshot(opts.document);

  this.controller = new ReaderController(this.doc, {});

  // Set up router
  var router = new SubstanceRouter(this);
  this.setRouter(router);
};

Substance.Article = require("substance-article");
Substance.Outline = require("lens-outline");

Substance.Prototype = function() {
  
  // Start listening to routes
  // --------

  this.render = function() {
    var container = $$('#container');
    var main  = $$('#main');

    container.appendChild(main);
    this.el.appendChild(container);
  };

  // Update State
  // --------
  // 
  // Since we just have one state this means we are ready to render
  // the one and only ReaderView
  // TODO: this is kind of a workaround: updateState is called from
  // the SubstanceRouter which is really not the right place

  this.updateState = function() {
    this.$('#main').html(this.controller.view.el);
    this.updateTitle(this.doc.title);
  };
};

Substance.Prototype.prototype = Application.prototype;
Substance.prototype = new Substance.Prototype();
Substance.prototype.constructor = Substance;


Substance.util = require("substance-util");
Substance.Application = require("substance-application");
Substance.Commander = require("substance-commander");
Substance.Document = require("substance-document");
Substance.Operator = require("substance-operator");
Substance.Chronicle = require("substance-chronicle");
Substance.Data = require("substance-data");
Substance.RegExp = require("substance-regexp");
Substance.Surface = require("substance-surface");

module.exports = Substance;
