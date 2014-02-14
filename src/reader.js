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


// The Substance Reader Application
// ========
//

var Reader = function(opts) {
  Application.call(this, opts);

  this.doc = Article.fromSnapshot(opts.document);

  this.controller = new ReaderController(this.doc, {});

  // Set up router
  var router = new SubstanceRouter(this);
  this.setRouter(router);
};

Reader.Article = require("substance-article");
Reader.Outline = require("lens-outline");

Reader.Prototype = function() {


  this.isIOSDevice = function() {
    var iPadAgent = navigator.userAgent.match(/iPad/i) != null;
    var iPodAgent = navigator.userAgent.match(/iPhone/i) != null;
    return iPadAgent || iPodAgent;
  };

  this.isIphone = function() {
    var iPhoneAgent = navigator.userAgent.match(/iPhone/i) != null;
    return iPhoneAgent;
  };

  this.isMobile = function() {
    var iPadAgent = navigator.userAgent.match(/iPad/i) != null;
    var iPodAgent = navigator.userAgent.match(/iPhone/i) != null;
    var AndroidAgent = navigator.userAgent.match(/Android/i) != null;
    var webOSAgent = navigator.userAgent.match(/webOS/i) != null;

    return iPadAgent || iPodAgent || AndroidAgent || webOSAgent;
  };

  this.isTouchDevice = function() {
    return 'ontouchstart' in document.documentElement;
  };


  // Start listening to routes
  // --------

  this.render = function() {
    var container = $$('#container');
    
    if (this.isTouchDevice()) {
      $(container).addClass('touchable');
    }

    if (this.isIOSDevice()) {
      $(container).addClass('ios');
    }

    if (this.isIphone()) {
      $(container).addClass('iphone');
    }

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

  this.afterTransition = function(newState, oldState) {
    // Experimental: only add the view if the oldState was null
    if (!oldState) {
      this.$('#main').html(this.controller.view.el);
      this.updateTitle(this.doc.title);
    }
  };
};

Reader.Prototype.prototype = Application.prototype;
Reader.prototype = new Reader.Prototype();
Reader.prototype.constructor = Reader;


module.exports = Reader;
