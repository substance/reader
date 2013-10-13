"use strict";

var _ = require("underscore");
var util = require("substance-util");
var html = util.html;
var Surface = require("substance-surface");
var Outline = require("lens-outline");
var View = require("substance-application").View;
var TOC = require("substance-toc");
var Data = require("substance-data");
var Index = Data.Graph.Index;
var $$ = require("substance-application").$$;

var CORRECTION = -100; // Extra offset from the top

var addFocusControls = function(doc, nodeView) {
  // The content node object
  var node = nodeView.node;

  // Per mode
  var focusToggles = [];

  focusToggles.push($$('div', {
    "sbs-click": 'toggleNode(toc,'+node.id+')',
    class: "focus-mode node",
    html: '<div class="arrow"></div><i class="icon-anchor"></i>',
    title: 'Focus and share link'
  }));

  var focus = $$('div.focus', {
    children: focusToggles
  });

  // Add stripe
  focus.appendChild($$('.stripe'));
  nodeView.el.appendChild(focus);
};


var addResourceHeader = function(docCtrl, nodeView) {
  var node = nodeView.node;
  var typeDescr = node.constructor.description;

  // Don't render resource headers in info panel (except for person nodes)
  if (docCtrl.view === "info" && node.type !== "person" && node.type !== "collaborator") {
    return;
  }

  var children = [
    $$('a.name', {
      href: "#",
      text: node.header ,
      "sbs-click": "toggleResource("+node.id+")"
    })
  ];

  var config = node.constructor.config;
  if (config && config.zoomable) {
    children.push($$('a.toggle-fullscreen', {
      "href": "#",
      "html": "<i class=\"icon-resize-full\"></i><i class=\"icon-resize-small\"></i>",
      "sbs-click": "toggleFullscreen("+node.id+")"
    }));
  }

  var resourceHeader = $$('.resource-header', {
    children: children
  });
  nodeView.el.insertBefore(resourceHeader, nodeView.content);
};


// Renders the reader view
// --------
// 
// .document
// .context-toggles
//   .toggle-toc
//   .toggle-figures
//   .toggle-citations
//   .toggle-info
// .resources
//   .toc
//   .surface.figures
//   .surface.citations
//   .info

var Renderer = function(reader) {

  var frag = document.createDocumentFragment();

  // Prepare doc view
  // --------

  var docView = $$('.document');
  docView.appendChild(reader.contentView.render().el);

  // Prepare context toggles
  // --------

  var children = [];

  if (reader.tocView && reader.tocView.headings.length > 2) {
    children.push($$('.context-toggle.toc', {
      'sbs-click': 'switchContext(toc)',
      'html': '<i class="icon-align-left"></i><span> Contents</span>'
    }));
  }

  if (reader.figuresView) {
    children.push($$('.context-toggle.figures', {
      'sbs-click': 'switchContext(figures)',
      'html': '<i class="icon-camera"></i><span> Figures</span>'
    }));
  }

  if (reader.citationsView) {
    children.push($$('.context-toggle.citations', {
      'sbs-click': 'switchContext(citations)',
      'html': '<i class="icon-link"></i><span> References</span>'
    }));
  }

  if (reader.infoView) {
    children.push($$('.context-toggle.info', {
      'sbs-click': 'switchContext(info)',
      'html': '<i class="icon-info-sign"></i><span> Article Info</span>'
    }));
  }

  var contextToggles = $$('.context-toggles', {
    children: children
  });

  // Prepare resources view
  // --------

  var resourcesView = $$('.resources');
  resourcesView.appendChild(contextToggles);
  

  // Add TOC
  // --------
 
  resourcesView.appendChild(reader.tocView.render().el);

  if (reader.figuresView) {
    resourcesView.appendChild(reader.figuresView.render().el);
  }
  
  if (reader.citationsView) {
    resourcesView.appendChild(reader.citationsView.render().el);
  }

  if (reader.infoView) {
    resourcesView.appendChild(reader.infoView.render().el);
  }

  frag.appendChild(docView);
  frag.appendChild(resourcesView);
  return frag;
};


// Lens.Reader.View
// ==========================================================================
//

var ReaderView = function(readerCtrl) {
  View.call(this);

  // Controllers
  // --------

  this.readerCtrl = readerCtrl;

  var doc = this.readerCtrl.content.__document;

  this.$el.addClass('article');
  this.$el.addClass(doc.schema.id); // Substance article or lens article?


  var ArticleRenderer = this.readerCtrl.content.__document.constructor.Renderer;

  // Surfaces
  // --------

  // A Substance.Document.Writer instance is provided by the controller
  this.contentView = new Surface(this.readerCtrl.content, {
    editable: false,
    renderer: new ArticleRenderer(this.readerCtrl.content, {
      afterRender: addFocusControls
    })
  });

  // Table of Contents 
  // --------

  this.tocView = new TOC(this.readerCtrl);

  // Provisional Hack:
  // -----------------
  // 
  // We sniff into the tocView to determine the default context based on how many 
  // headings are in the document
  // We show the TOC for headings.length > 2
  // 
  // Real solution: determine on the controller level wheter toc should be shown or not

  if (this.tocView.headings.length <= 2) {
    var newCtx;
    if (doc.get('figures').nodes.length > 0) {
      newCtx = "figures";
    } else {
      newCtx = "info";
    }

    this.readerCtrl.modifyState({
      context: newCtx
    });
  }

  this.tocView.$el.addClass('resource-view');

  // A Surface for the figures view
  if (this.readerCtrl.figures && this.readerCtrl.figures.get('figures').nodes.length) {
    this.figuresView = new Surface(this.readerCtrl.figures, {
      editable: false,
      renderer: new ArticleRenderer(this.readerCtrl.figures, {
        afterRender: addResourceHeader
      })
    });
    this.figuresView.$el.addClass('resource-view');
  }

  // A Surface for the citations view
  if (this.readerCtrl.citations && this.readerCtrl.citations.get('citations').nodes.length) {
    this.citationsView = new Surface(this.readerCtrl.citations, {
      editable: false,
      renderer: new ArticleRenderer(this.readerCtrl.citations, {
        afterRender: addResourceHeader
      })
    });
    this.citationsView.$el.addClass('resource-view');
  }

  // A Surface for the info view
  if (this.readerCtrl.info && this.readerCtrl.info.get('info').nodes.length) {
    this.infoView = new Surface(this.readerCtrl.info, {
      editable: false,
      renderer: new ArticleRenderer(this.readerCtrl.info, {
        afterRender: addResourceHeader
      })
    });
    this.infoView.$el.addClass('resource-view');
  }

  // Whenever a state change happens (e.g. user navigates somewhere)
  // the interface gets updated accordingly
  this.listenTo(this.readerCtrl, "state-changed", this.updateState);


  // Keep an index for resources
  this.resources = new Index(this.readerCtrl.__document, {
    types: ["figure_reference", "citation_reference", "person_reference"],
    property: "target"
  });


  // Outline
  // --------

  this.outline = new Outline(this.contentView);

  // DOM Events
  // --------
  // 

  this.contentView.$el.on('scroll', _.bind(this.onContentScroll, this));

  // Resource references
  this.$el.on('click', '.annotation.figure_reference', _.bind(this.toggleFigureReference, this));
  this.$el.on('click', '.annotation.citation_reference', _.bind(this.toggleCitationReference, this));
  this.$el.on('click', '.annotation.person_reference', _.bind(this.togglePersonReference, this));
  this.$el.on('click', '.annotation.cross_reference', _.bind(this.followCrossReference, this));

  this.outline.$el.on('click', '.node', _.bind(this._jumpToNode, this));

};


ReaderView.Prototype = function() {

  // Toggles on and off the zoom
  // --------
  // 

  this.toggleFullscreen = function(resourceId) {
    var state = this.readerCtrl.state;

    // Always activate the resource
    this.readerCtrl.modifyState({
      resource: resourceId,
      fullscreen: !state.fullscreen
    });

    // this.$('#'+resourceId)
  };

  this._jumpToNode = function(e) {
    var nodeId = $(e.currentTarget).attr('id').replace("outline_", "");
    this.jumpToNode(nodeId);
    return false;
  };

  // Toggle Resource Reference
  // --------
  //

  this.toggleFigureReference = function(e) {
    this.toggleResourceReference('figures', e);
  };

  this.toggleCitationReference = function(e) {
    this.toggleResourceReference('citations', e);
  };

  this.togglePersonReference = function(e) {
    this.toggleResourceReference('info', e);
  };

  this.toggleResourceReference = function(context, e) {
    var state = this.readerCtrl.state;
    var aid = $(e.currentTarget).attr('id');
    var a = this.readerCtrl.__document.get(aid);

    var nodeId = this.readerCtrl.content.container.getRoot(a.path[0]);

    var resourceId = a.target;

    if (resourceId === state.resource) {
      this.readerCtrl.modifyState({
        context: this.readerCtrl.currentContext,
        node: null,
        resource:  null
      });
    } else {
      this.readerCtrl.modifyState({
        context: context,
        node: nodeId,
        resource: resourceId
      });

      this.jumpToResource(resourceId);
    }
  };

  // Follow cross reference
  // --------
  //

  this.followCrossReference = function(e) {
    var aid = $(e.currentTarget).attr('id');
    var a = this.readerCtrl.__document.get(aid);
    this.jumpToNode(a.target);
  };


  // Toggle on-off a resource
  // --------
  //

  this.onContentScroll = function() {
    var scrollTop = this.contentView.$el.scrollTop();
    this.outline.updateVisibleArea(scrollTop);
    this.markActiveHeading(scrollTop);
  };


  // Clear selection
  // --------
  //

  this.markActiveHeading = function(scrollTop) {
    var contentHeight = $('.nodes').height();

    // No headings?
    if (this.tocView.headings.length === 0) return;

    // Use first heading as default
    var activeNode = _.first(this.tocView.headings).id;

    this.contentView.$('.content-node.heading').each(function() {
      if (scrollTop >= $(this).position().top + CORRECTION) {
        activeNode = this.id;
      }
    });

    // Edge case: select last item (once we reach the end of the doc)
    if (scrollTop + this.contentView.$el.height() >= contentHeight) {
      activeNode = _.last(this.tocView.headings).id;
    }
    this.tocView.setActiveNode(activeNode);
  };

  // Toggle on-off a resource
  // --------
  //

  this.toggleResource = function(id) {
    var state = this.readerCtrl.state;
    var node = state.node;
    // Toggle off if already on
    if (state.resource === id) {
      id = null;
      node = null;
    }

    this.readerCtrl.modifyState({
      fullscreen: false,
      resource: id,
      node: node
    });
  };

  // Jump to the given node id
  // --------
  //

  this.jumpToNode = function(nodeId) {
    var $n = $('#'+nodeId);
    if ($n.length > 0) {
      var topOffset = $n.position().top+CORRECTION;
      this.contentView.$el.scrollTop(topOffset);
    }
  };

  // Jump to the given resource id
  // --------
  //

  this.jumpToResource = function(nodeId) {
    var $n = $('#'+nodeId);
    if ($n.length > 0) {
      var topOffset = $n.position().top;

      // TODO: Brute force for now
      // Make sure to find out which resource view is currently active
      if (this.figuresView) this.figuresView.$el.scrollTop(topOffset);
      if (this.citationsView) this.citationsView.$el.scrollTop(topOffset);
      if (this.infoView) this.infoView.$el.scrollTop(topOffset);
    }
  };


  // Toggle on-off node focus
  // --------
  //

  this.toggleNode = function(context, nodeId) {
    var state = this.readerCtrl.state;

    if (state.node === nodeId && state.context === context) {
      // Toggle off -> reset, preserve the context
      this.readerCtrl.modifyState({
        context: this.readerCtrl.currentContext,
        node: null,
        resource: null
      });
    } else {
      this.readerCtrl.modifyState({
        context: context,
        node: nodeId,
        resource: null
      });
    }
  };

  // Explicit context switch
  // --------
  //

  this.switchContext = function(context) {
    this.readerCtrl.switchContext(context);
  };

  // Update Reader State
  // --------
  // 

  this.updateState = function(options) {
    options = options || {};
    var state = this.readerCtrl.state;
    var that = this;

    // Set context on the reader view
    // -------

    this.$el.removeClass('toc figures citations info');
    this.contentView.$('.content-node.active').removeClass('active');
    this.$el.addClass(state.context);
  
    if (state.node) {
      this.contentView.$('#'+state.node).addClass('active');
    }

    // According to the current context show active resource panel
    // -------
    this.updateResource();
  };


  // Based on the current application state, highlight the current resource
  // -------
  // 
  // Triggered by updateState

  this.updateResource = function() {
    var state = this.readerCtrl.state;
    this.$('.resources .content-node.active').removeClass('active fullscreen');
    this.contentView.$('.annotation.active').removeClass('active');
    
    if (state.resource) {
      // Show selected resource
      var $res = this.$('#'+state.resource);
      $res.addClass('active');
      if (state.fullscreen) $res.addClass('fullscreen');

      // Mark all annotations that reference the resource
      var annotations = this.resources.get(state.resource);
      
      _.each(annotations, function(a) {
        this.contentView.$('#'+a.id).addClass('active');
      }, this);

      // Update outline
    } else {
      // Hide all resources
    }

    this.updateOutline();
  };

  // Whenever the app state changes
  // --------
  // 
  // Triggered by updateResource.

  this.updateOutline = function() {
    var that = this;

    var state = this.readerCtrl.state;
    var container = this.readerCtrl.content.container;

    // Find all annotations
    // TODO: this is supposed to be slow -> optimize
    var annotations = _.filter(this.readerCtrl.content.getAnnotations(), function(a) {
      return a.target && a.target === state.resource;
    }, this);

    var nodes = _.uniq(_.map(annotations, function(a) {
      var nodeId = container.getRoot(a.path[0]);
      return nodeId;
    }));

    that.outline.update({
      context: state.context,
      selectedNode: state.node,
      highlightedNodes: nodes
    });
  };

  // Annotate current selection
  // --------
  //

  this.annotate = function(type) {
    this.readerCtrl.content.annotate(type);
    return false;
  };

  // Rendering
  // --------
  //

  this.render = function() {
    var that = this;

    var state = this.readerCtrl.state;
    this.el.appendChild(new Renderer(this));

    // After rendering make reader reflect the app state
    this.$('.document').append(that.outline.el);

    // Await next UI tick to update layout and outline
    _.delay(function() {
      // Render outline that sticks on this.surface
      // that.updateLayout();
      that.updateState();
      MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
    }, 1);

    // Wait for stuff to be rendered (e.g. formulas)
    // TODO: use a handler? MathJax.Hub.Queue(fn) does not work for some reason

    _.delay(function() {
      that.updateOutline();
    }, 2000);

    var lazyOutline = _.debounce(function() {
      // that.updateLayout();
      that.updateOutline();
    }, 1);

    // Jump marks for teh win
    if (state.node) {
      _.delay(function() {
        that.jumpToNode(state.node);
        if (state.resource) {
          that.jumpToResource(state.resource);
        }
      }, 100);
    }

    $(window).resize(lazyOutline);
    
    return this;
  };

  // Recompute Layout properties
  // --------
  // 
  // This fixes some issues that can't be dealth with CSS

  // this.updateLayout = function() {
  //   // var docWidth = this.$('.document').width();
  //   // 15 = margin for arrows, 42 ?? WTF
  //   // this.contentView.$('.nodes > .content-node').css('width', docWidth - 15 - 42);
  // },

  // Free the memory.
  // --------
  //

  this.dispose = function() {
    this.contentView.dispose();
    if (this.figuresView) this.figuresView.dispose();
    if (this.citationsView) this.citationsView.dispose();
    if (this.infoView) this.infoView.dispose();
    this.stopListening();
  };
};

ReaderView.Prototype.prototype = View.prototype;
ReaderView.prototype = new ReaderView.Prototype();
ReaderView.prototype.constructor = ReaderView;

module.exports = ReaderView;
