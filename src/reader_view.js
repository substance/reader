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


var addResourceHeader = function(docCtrl, nodeView) {
  var node = nodeView.node;
  var typeDescr = node.constructor.description;

  // Don't render resource headers in info panel (except for contributor nodes)
  // TODO: Do we really need 'collaborator'?
  if (docCtrl.view === "info" && node.type !== "contributor" && node.type !== "collaborator") {
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

  children.push($$('a.toggle-res', {
    "href": "#",
    "sbs-click": "toggleResource("+node.id+")",
    "html": "<i class=\"icon-eye-open\"></i><i class=\"icon-eye-close\"></i>"
  }));

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


  //  && reader.tocView.headings.length > 2
  if (reader.tocView) {
    children.push($$('a.context-toggle.toc', {
      'href': '#',
      'sbs-click': 'switchContext(toc)',
      'title': 'Text',
      'html': '<i class="icon-align-left"></i><span> Text</span>'
    }));
  }

  if (reader.figuresView) {
    children.push($$('a.context-toggle.figures', {
      'href': '#',
      'sbs-click': 'switchContext(figures)',
      'title': 'Figures',
      'html': '<i class="icon-picture"></i><span> Figures</span>'
    }));
  }

  if (reader.citationsView) {
    children.push($$('a.context-toggle.citations', {
      'href': '#',
      'sbs-click': 'switchContext(citations)',
      'title': 'Citations',
      'html': '<i class="icon-link"></i><span> Citations</span>'
    }));
  }

  if (reader.definitionsView) {
    children.push($$('a.context-toggle.definitions', {
      'href': '#',
      'sbs-click': 'switchContext(definitions)',
      'title': 'Definitions',
      'html': '<i class="icon-book"></i><span>Definitions</span>'
    }));
  }

  if (reader.infoView) {
    children.push($$('a.context-toggle.info', {
      'href': '#',
      'sbs-click': 'switchContext(info)',
      'title': 'Article Info',
      'html': '<i class="icon-info-sign"></i><span>Info</span>'
    }));
  }




  var contextToggles = $$('.context-toggles', {
    children: children
  });


  // Prepare resources view
  // --------

  var medialStrip = $$('.medial-strip');

  var collection = reader.readerCtrl.options.collection
  if (collection) {
    medialStrip.appendChild($$('a.back-nav', {
      'href': collection.url,
      'title': 'Go back',
      'html': '<i class=" icon-chevron-up"></i>'
    }));
  }

  medialStrip.appendChild($$('.separator-line'));
  medialStrip.appendChild(contextToggles);

  frag.appendChild(medialStrip);
  
  // Wrap everything within resources view
  var resourcesView = $$('.resources');


  // resourcesView.appendChild(medialStrip);
  

  // Add TOC
  // --------
 
  resourcesView.appendChild(reader.tocView.render().el);

  if (reader.figuresView) {
    resourcesView.appendChild(reader.figuresView.render().el);
  }
  
  if (reader.citationsView) {
    resourcesView.appendChild(reader.citationsView.render().el);
  }

  if (reader.definitionsView) {
    resourcesView.appendChild(reader.definitionsView.render().el);
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

  // Stores latest body scroll positions per context
  // Only relevant
  this.bodyScroll = {};

  var ArticleRenderer = this.readerCtrl.content.__document.constructor.Renderer;

  // Surfaces
  // --------

  // A Substance.Document.Writer instance is provided by the controller
  this.contentView = new Surface(this.readerCtrl.content, {
    editable: false,
    renderer: new ArticleRenderer(this.readerCtrl.content, {
      // afterRender: addFocusControls
    })
  });

  // Table of Contents 
  // --------

  this.tocView = new TOC(this.readerCtrl);

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


  // A Surface for the definitions View
  if (this.readerCtrl.definitions && this.readerCtrl.definitions.get('definitions').nodes.length) {
    this.definitionsView = new Surface(this.readerCtrl.definitions, {
      editable: false,
      renderer: new ArticleRenderer(this.readerCtrl.definitions, {
        afterRender: addResourceHeader
      })
    });
    this.definitionsView.$el.addClass('resource-view');
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
    types: ["figure_reference", "citation_reference", "contributor_reference", "definition_reference"],
    property: "target"
  });


  // Outline
  // --------

  this.outline = new Outline(this.contentView);


  // Resource Outline
  // --------

  this.resourcesOutline = new Outline(this.figuresView);

  // DOM Events
  // --------
  // 

  this.contentView.$el.on('scroll', _.bind(this.onContentScroll, this));

  // Resource content that is being scrolled
  if (this.figuresView) this.figuresView.$el.on('scroll', _.bind(this.onResourceContentScroll, this));
  if (this.citationsView) this.citationsView.$el.on('scroll', _.bind(this.onResourceContentScroll, this));
  if (this.definitionsView) this.definitionsView.$el.on('scroll', _.bind(this.onResourceContentScroll, this));
  if (this.infoView) this.infoView.$el.on('scroll', _.bind(this.onResourceContentScroll, this));

  // Resource references
  this.$el.on('click', '.annotation.figure_reference', _.bind(this.toggleFigureReference, this));
  this.$el.on('click', '.annotation.citation_reference', _.bind(this.toggleCitationReference, this));
  this.$el.on('click', '.annotation.contributor_reference', _.bind(this.toggleContributorReference, this));
  this.$el.on('click', '.annotation.definition_reference', _.bind(this.toggleDefinitionReference, this));

  this.$el.on('click', '.annotation.cross_reference', _.bind(this.followCrossReference, this));

  this.$el.on('click', '.document .content-node.heading', _.bind(this.setAnchor, this));
  
  this.$el.on('click', '.document .content-node.heading .top', _.bind(this.gotoTop, this));

  this.outline.$el.on('click', '.node', _.bind(this._jumpToNode, this));

};


ReaderView.Prototype = function() {
  
  this.setAnchor = function(e) {
    this.toggleNode('toc', $(e.currentTarget).attr('id'));
  };

  this.gotoTop = function() {
    // Jump to cover node as that's easiest
    this.jumpToNode("cover");
    $(document).scrollTop(0);
    return false;
  }

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
    e.preventDefault();
  };

  this.toggleDefinitionReference = function(e) {
    this.toggleResourceReference('definitions', e);
    e.preventDefault();
  };

  this.toggleCitationReference = function(e) {
    this.toggleResourceReference('citations', e);
    e.preventDefault();
  };

  this.toggleContributorReference = function(e) {
    this.toggleResourceReference('info', e);
    e.preventDefault();
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
      this.saveScroll();
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


  // On Scroll update outline and mark active heading
  // --------
  //

  this.onContentScroll = function() {
    var scrollTop = this.contentView.$el.scrollTop();
    this.outline.updateVisibleArea(scrollTop);
    this.markActiveHeading(scrollTop);
  };

  this.onResourceContentScroll = function() {
    var scrollTop = this.resourcesOutline.surface.$el.scrollTop();
    this.resourcesOutline.updateVisibleArea(scrollTop);
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
      if (this.definitionsView) this.definitionsView.$el.scrollTop(topOffset);
      if (this.infoView) this.infoView.$el.scrollTop(topOffset);

      // Brute force for mobile
      $(document).scrollTop(topOffset);
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

  // Get scroll position of active panel
  // --------
  // 
  // Content, Figures, Citations, Info

  this.getScroll = function() {
    // Only covers the mobile mode!
    return $(document).scrollTop();
  };

  // Recover scroll from previous state (if there is any)
  // --------
  // 
  // TODO: retrieve from cookie to persist scroll pos over reload?

  this.recoverScroll = function() {
    var targetScroll = this.bodyScroll[this.readerCtrl.state.context];

    if (targetScroll) {
      $(document).scrollTop(targetScroll);
    } else {
      // Scroll to top
      // $(document).scrollTop(0);
    }
  };

  // Save current scroll position
  // --------
  // 

  this.saveScroll = function() {
    this.bodyScroll[this.readerCtrl.state.context] = this.getScroll();
  };

  // Explicit context switch
  // --------
  //
  // Only triggered by the explicit switch
  // Implicit context switches happen someone clicks a figure reference

  this.switchContext = function(context) {
    // var currentContext = this.readerCtrl.state.context;
    this.saveScroll();

    // Which view actions are triggered here?
    this.readerCtrl.switchContext(context);
    this.recoverScroll();
  };

  // Update Reader State
  // --------
  // 
  // Called every time the controller state has been modified
  // Search for readerCtrl.modifyState occurences

  this.updateState = function(options) {
    options = options || {};
    var state = this.readerCtrl.state;
    var that = this;

    // Set context on the reader view
    // -------

    this.$el.removeClass('toc figures citations info definitions');
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
      this.recoverScroll();
      // Hide all resources (see above)
    }

    this.updateOutline();
  };

  // Returns true when on a mobile device
  // --------

  this.isMobile = function() {

  };

  // Whenever the app state changes
  // --------
  // 
  // Triggered by updateResource.

  this.updateOutline = function() {
    var that = this;
    var state = this.readerCtrl.state;
    var container = this.readerCtrl.content.container;

    var nodes = this.getResourceReferenceContainers();

    that.outline.update({
      context: state.context,
      selectedNode: state.node,
      highlightedNodes: nodes
    });


    // Resources outline
    // -------------------

    if (state.context === "toc") {
      // that.resourcesOutline.surface = this.tocView;
      $(that.resourcesOutline.el).addClass('hidden');
      return;
    } else if (state.context === "figures") {
      that.resourcesOutline.surface = this.figuresView;
    } else if (state.context === "citations") {
      that.resourcesOutline.surface = this.citationsView;
    } else if (state.context === "definitions") {
      that.resourcesOutline.surface = this.definitionsView;
    } else {
      that.resourcesOutline.surface = this.infoView;
    }

    $(that.resourcesOutline.el).removeClass('hidden');

    that.resourcesOutline.update({
      context: state.context,
      selectedNode: state.node,
      highlightedNodes: [state.resource]
    });
  };

  this.getResourceReferenceContainers = function() {
    var state = this.readerCtrl.state;

    if (!state.resource) return [];

    // A reference is an annotation node. We want to highlight
    // all (top-level) nodes that contain a reference to the currently activated resource
    // For that we take all references pointing to the resource
    // and find the root of the node on which the annotation sticks on.
    var references = this.resources.get(state.resource);
    var container = this.readerCtrl.content.container;
    var nodes = _.uniq(_.map(references, function(ref) {
      var nodeId = container.getRoot(ref.path[0]);
      return nodeId;
    }));
    return nodes;
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

    this.$('.resources').append(that.resourcesOutline.el);

    // Await next UI tick to update layout and outline
    _.delay(function() {
      // Render outline that sticks on this.surface
      that.updateState();
      MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
    }, 1);

    // Wait for stuff to be rendered (e.g. formulas)
    // TODO: use a handler? MathJax.Hub.Queue(fn) does not work for some reason

    _.delay(function() {
      that.updateOutline();
    }, 2000);

    var lazyOutline = _.debounce(function() {
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


  // Free the memory.
  // --------
  //

  this.dispose = function() {
    this.contentView.dispose();
    if (this.figuresView) this.figuresView.dispose();
    if (this.citationsView) this.citationsView.dispose();
    if (this.infoView) this.infoView.dispose();
    this.resources.dispose();

    this.stopListening();
  };
};

ReaderView.Prototype.prototype = View.prototype;
ReaderView.prototype = new ReaderView.Prototype();
ReaderView.prototype.constructor = ReaderView;

module.exports = ReaderView;
