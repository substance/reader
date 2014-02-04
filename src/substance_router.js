"use strict";

var _ = require("underscore");
var Router = require("substance-application").Router;

var SubstanceRouter = function(app, routes) {
  Router.call(this);

  this.app = app;

  _.each(SubstanceRouter.routes, function(route) {
    if (!this[route.command]) {
      console.error("Unknown route handler: ", route.command);
    } else {
      this.route(route.route, route.name, _.bind(this[route.command], this));
    }
  }, this);

  this.route(/^state=.*$/, "state", _.bind(this.openState, this));
};


SubstanceRouter.Prototype = function() {

  this.start = function() {
    Router.history.start();
  };

  var DEFAULT_OPTIONS = {
    updateRoute: false,
    replace: false
  };

  this.openState = function() {
    var fragment = Router.history.getFragment();
    var state = this.app.stateFromFragment(fragment);
    this.app.switchState(state, DEFAULT_OPTIONS);
  };

  this.openReader = function(context, node, resource, fullscreen) {
    this.app.switchState({id: "main", contextId: "toc"}, DEFAULT_OPTIONS);
  };

  this.navigate = function(route, options) {
    Router.history.navigate(route, options);
  };
};

SubstanceRouter.Prototype.prototype = Router.prototype;
SubstanceRouter.prototype = new SubstanceRouter.Prototype();

SubstanceRouter.routes = [
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

module.exports = SubstanceRouter;