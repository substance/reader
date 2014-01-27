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

var CORRECTION = 0; // Extra offset from the top (e.g. when there's a fixed menu bar etc.)

// a function defined below
var __createRenderer;
var __createSurface;
var __addResourcePanel;


// Lens.Reader.View
// ==========================================================================
//

var ReaderView = function(readerCtrl, options) {
  View.call(this);

  // Controllers
  // --------

  this.readerCtrl = readerCtrl;
  this.options = options || {};

  var doc = this.readerCtrl.document;

  this.$el.addClass('article');
  this.$el.addClass(doc.schema.id); // Substance article or lens article?

  // Stores latest body scroll positions per context
  // Only relevant
  this.bodyScroll = {};

  // Surfaces
  // --------

  this.contentView = __createSurface(this, doc, "content");
  this.contentView.el.classList.add("content");

  // Table of Contents 
  // --------

  this.tocView = new TOC(this.readerCtrl.contentCtrl);
  this.tocView.$el.addClass('resource-view');

  // Other resource panels
  // --------

  // A Surface for the figures view
  if (this.readerCtrl.hasFigures()) __addResourcePanel(this, doc, "figures");

  // A Surface for the info view
  if (this.readerCtrl.hasInfo()) __addResourcePanel(this, doc, "info");

  // Index for resources
  // --------
  // 
  // Keep in mind that Substance.Article uses collaborator_reference while the Lens article has
  // contributor_reference instances.

  this.resources = new Index(this.readerCtrl.document, {
    types: ["figure_reference", "citation_reference", "contributor_reference"],
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
  if (this.infoView) this.infoView.$el.on('scroll', _.bind(this.onResourceContentScroll, this));

  // Resource references
  this.$el.on('click', '.annotation.figure_reference', _.bind(this.toggleFigureReference, this));
  this.$el.on('click', '.annotation.citation_reference', _.bind(this.toggleCitationReference, this));
    
  this.$el.on('click', '.resources .content-node .toggle-resource', _.bind(this.toggleResource, this));
  this.$el.on('click', '.authors .toggle-author', _.bind(this.toggleAuthor, this));

  this.$el.on('click', '.annotation.cross_reference', _.bind(this.followCrossReference, this));
  this.$el.on('click', '.document .content-node.heading', _.bind(this.setAnchor, this));
  
  // this.$el.on('click', '.document .content-node.heading .top', _.bind(this.gotoTop, this));

  this.outline.$el.on('click', '.node', _.bind(this._jumpToNode, this));
};


ReaderView.Prototype = function() {

  // Toggles on and off the zoom
  // --------
  // 

  this.toggleAuthor = function(e) {
    var resourceId = e.currentTarget.getAttribute('data-id');
    var state = this.readerCtrl.state;
    
    if (state.resourceId === resourceId) {
      // Reset
      this.readerCtrl.switchState({
        id: "main",
        contextId: "toc"
      });
    } else {
      // Highlight
      this.readerCtrl.switchState({
        id: "main",
        contextId: "info",
        resourceId: resourceId
      });
    }
    return false;
  };
  
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

  this.toggleCitationReference = function(e) {
    this.toggleResourceReference('citations', e);
    e.preventDefault();
  };


  this.toggleResourceReference = function(context, e) {
    var state = this.readerCtrl.state;
    var aid = $(e.currentTarget).attr('id');
    var a = this.readerCtrl.document.get(aid);
    var resourceId = a.target;

    if (resourceId === state.resourceId) {
      this.readerCtrl.switchState({
        contextId: this.readerCtrl.currentContext || "toc"
        // resourceId:  undefined
      });
    } else {
      this.readerCtrl.switchState({
        contextId: context,
        resourceId: resourceId
      });
    }
  };

  // Follow cross reference
  // --------
  //

  this.followCrossReference = function(e) {
    var aid = $(e.currentTarget).attr('id');
    var a = this.readerCtrl.document.get(aid);
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

  this.toggleResource = function(e) {
    var resourceId = $(e.currentTarget).parent().parent().attr('id');
    var state = this.readerCtrl.state;

    var newState = {
      contextId: state.contextId,
    };

    // Toggle off if already on
    if (state.resourceId !== resourceId) {
      newState.resourceId = resourceId;
    }

    this.readerCtrl.switchState(newState);
  };

  // Jump to the given node id
  // --------
  //

  this.jumpToNode = function(nodeId) {
    var $n = $('#'+nodeId);

    if ($n.length <= 0) return;

    var topOffset = $n.position().top+CORRECTION;
    this.contentView.$el.scrollTop(topOffset);
  };

  // Determines whether parts of an element are visible on screen or not
  // --------
  // 
  // Only consideres vertical bounds

  this.isElementInViewport = function(el) {
    var rect = el.getBoundingClientRect();
    var windowHeight = $(window).height();

    var topEdgeVisible = rect.top >= 0 && rect.top <= windowHeight;
    var bottomEdgeVisible = rect.bottom >= 0 && rect.bottom <= windowHeight;
    var topEdgeAboveAndBottomEdgeBelow = rect.top < 0 && rect.bottom > 0;

    return topEdgeVisible || bottomEdgeVisible || topEdgeAboveAndBottomEdgeBelow;
  };

  // Jump to the given resource id
  // --------
  //

  this.jumpToResource = function(nodeId) {
    var $n = $('#'+nodeId);
    if ($n.length <= 0) return;

    // Check if node is already visible on the screen
    if (!this.isElementInViewport($n[0])) {
      var topOffset = $n.position().top;
      // TODO: Brute force for now
      // Make sure to find out which resource view is currently active
      if (this.figuresView) this.figuresView.$el.scrollTop(topOffset);
      if (this.citationsView) this.citationsView.$el.scrollTop(topOffset);
      if (this.infoView) this.infoView.$el.scrollTop(topOffset);

      // Brute force for mobile
      $(document).scrollTop(topOffset);
    }
  };


  // Toggle on-off node focus
  // --------
  //

  this.toggleNode = function(context, nodeId) {
    console.log('TODO: implement toggle node');
    // var state = this.readerCtrl.state;

    // if (state.node === nodeId && state.context === context) {
    //   // Toggle off -> reset, preserve the context
    //   this.readerCtrl.modifyState({
    //     context: this.readerCtrl.currentContext,
    //     node: null,
    //     resource: null
    //   });
    // } else {
    //   this.readerCtrl.modifyState({
    //     context: context,
    //     node: nodeId,
    //     resource: null
    //   });
    // }
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
  // Implicit context switches happen if someone clicks a figure reference

  this.switchContext = function(contextId) {
    this.readerCtrl.currentContext = contextId;
    this.readerCtrl.switchState({
      id: "main",
      contextId: contextId
    });
  };


  // Update Reader State
  // --------
  // 
  // Called every time the controller state has been modified
  // Search for readerCtrl.modifyState occurences

  this.updateState = function(state, oldState) {
    // HACK: avoid to call execute this when the ReaderController has
    // already been disposed;
    if (!state) return;

    // Set context on the main element
    // -------

    this.$el.removeClass();
    this.$el.addClass("article substance-article "+this.selectionState);

    this.contentView.$('.content-node.active').removeClass('active');

    // Remove active state from annotations
    this.$('.annotation.active').removeClass('active');

    // Reset focus classes
    this.$('.context-toggle')
      .removeClass('focus');

    // Note: by adding the context id to the main element
    // there are css rules that make only one panel visible
    this.$el.addClass("state-"+state.id);
    this.$el.addClass(this.readerCtrl.getContextId());

    // TODO: do we still need this?
    if (state.nodeId !== undefined) {
      this.contentView.$('#'+state.nodeId).addClass('active');
    }

    // According to the current context show active resource panel
    // -------

    this.updateResource();
    this.updateOutline();
  };

  // Based on the current application state, highlight the current resource
  // -------
  //
  // Triggered by updateState

  this.updateResource = function() {
    var state = this.readerCtrl.state;
    // HACK: avoid to call execute this when the ReaderController has
    // already been disposed;
    if (!state) return;

    this.$('.resources .content-node.active').removeClass('active fullscreen');
    this.$('.toggle-author').removeClass('active');

    // this.contentView.$('.annotation.active').removeClass('active');

    var annotations;
    if (state.resourceId !== undefined) {

      // TODO: This needs to be done delayed as the parent element must be injected in the DOM.
      // Despite of this being a secret hack it is definitely not a good way to go.
      // Instead, I would prefer if this could be done with the el already in the DOM.
      // E.g., that the first implicit transition ('initialized') will introduce the view to the DOM
      // and then `updateState` would not need to worry.
      // This needs some refactoring on the app state API, as 'initialized' is not explicitly reached
      // when a state is given.

      var that = this;
      _.delay(function() {
        // TODO: do we really need that?
        if (state.nodeId)  {
          that.jumpToNode(state.nodeId);
        }
        if (state.resourceId) {
          that.jumpToResource(state.resourceId);
        }
      }, 0);

      // Show selected resource
      var $res = this.$('#'+state.resourceId);
      $res.addClass('active');

      if (state.fullscreen) $res.addClass('fullscreen');

      // Mark all annotations that reference the resource

      annotations = this.resources.get(state.resourceId);

      _.each(annotations, function(a) {
        this.contentView.$('#'+a.id).addClass('active');
      }, this);

      // This is only used to mark author references on the cover as active
      // TODO: Use a smarter method as this is rather brute force
      this.$('#toggle_'+state.resourceId).addClass('active');
      // this.jumpToResource(state.resourceId);
    }
  };


  // Returns true when on a mobile device
  // --------

  // this.isMobile = function() {

  // };

  // Whenever the app state changes
  // --------
  // 
  // Triggered by updateResource.

  this.updateOutline = function() {
    var that = this;

    // TODO: improve this. Using the sub-controllers that way feels bad.

    var state = this.readerCtrl.state;

    // HACK: avoid to call execute this when the ReaderController has
    // already been disposed;
    if (!state) return;

    var contextId = this.readerCtrl.getContextId();

    var outlineParams = {
      context: contextId
    };

    var highlightedNodes;
    if (state.resourceId !== undefined) {
      highlightedNodes = this.readerCtrl.getResourceReferenceContainers(state.resourceId);
      outlineParams["highlightedNodes"] = highlightedNodes;
    }
    else if (state.nodeId !== undefined) {
      outlineParams["selectedNode"] = state.nodeId;
    }
    else if (state.id === "focus") {
      var focusState = this.readerCtrl.focusCtrl.state;
      highlightedNodes = this.readerCtrl.getResourceReferenceContainers(focusState.resourceId);
      outlineParams["highlightedNodes"] = highlightedNodes;
      outlineParams["context"] = focusState.contextId;
    }

    that.outline.update(outlineParams);

    // Resources outline
    // -------------------

    if (state.contextId === "toc") {
      // that.resourcesOutline.surface = this.tocView;
      $(that.resourcesOutline.el).addClass('hidden');
      return;
    } else if (state.contextId === "figures") {
      that.resourcesOutline.surface = this.figuresView;
    } else if (state.contextId === "remarks") {
      that.resourcesOutline.surface = this.remarksView;
    } else if (state.contextId === "errors") {
      that.resourcesOutline.surface = this.errorsView;
    } else {
      that.resourcesOutline.surface = this.infoView;
    }

    $(that.resourcesOutline.el).removeClass('hidden');


    that.resourcesOutline.update({
      context: state.contextId,
      // selectedNode: state.node,
      highlightedNodes: [state.resourceId]
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

    this.el.appendChild(_render(this));

    this.$('.document').append(that.outline.el);
    this.resourcesEl = this.el.querySelector(".resources");
    this.resourcesEl.appendChild(that.resourcesOutline.el);

    // Update the outline whenever the window is resized
    var lazyOutline = _.debounce(function() {
      that.updateOutline();
    }, 1);
    $(window).resize(lazyOutline);

    // Note: update outline can not be called here as this element has not been injected
    // into the DOM yet, thus, no layout information is available.
    // Calling that delayed does the trick.
    _.delay(function() {
      that.updateOutline();
    }, 0);

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



  var _render = function(self) {
    var frag = document.createDocumentFragment();

    // Prepare doc view
    // --------

    var docView = $$('.document');
    docView.appendChild(self.contentView.render().el);

    // Prepare context toggles
    // --------

    var children = [];

    //  && self.tocView.headings.length > 2
    if (self.tocView) {
      children.push($$('a.context-toggle.toc', {
        'href': '#',
        'sbs-click': 'switchContext(toc)',
        'title': 'Text',
        'html': '</i><i class="icon-align-left"></i><span> Text</span>'
      }));
    }

    if (self.figuresView) {
      children.push($$('a.context-toggle.figures', {
        'href': '#',
        'sbs-click': 'switchContext(figures)',
        'title': 'Figures',
        'html': '<i class="icon-picture"></i><span> Figures</span>'
      }));
    }

    if (self.infoView) {
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

    if (self.options["back"]) {
      var backEl = $$('a.back-nav', {
        'href': '#',
        // Don't know why... but this is sometimes not working... i.e., does not dispatch to the
        // given method. I am loosing trust in this mechanism and will use bare-metal event handlers.
        // 'sbs-click': 'back()',
        'title': 'Go back',
        'html': '<i class=" icon-chevron-up"></i>'
      });
      backEl.onclick = function(e) {
        self.options.back();
        e.preventDefault();
      };
      medialStrip.appendChild(backEl);
    }

    medialStrip.appendChild($$('.separator-line'));
    medialStrip.appendChild(contextToggles);

    // Wrap everything within resources view
    var resourcesView = $$('.resources');
    resourcesView.appendChild(medialStrip);

    // Add TOC
    // --------

    resourcesView.appendChild(self.tocView.render().el);

    if (self.figuresView) {
      resourcesView.appendChild(self.figuresView.render().el);
    }

    if (self.infoView) {
      resourcesView.appendChild(self.infoView.render().el);
    }

    frag.appendChild(docView);
    frag.appendChild(resourcesView);

    return frag;
  };

  var __findParentElement = function(el, selector) {
    var current = el;
    while(current !== undefined) {
      if ($(current).is(selector)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  };
};

ReaderView.Prototype.prototype = View.prototype;
ReaderView.prototype = new ReaderView.Prototype();
ReaderView.prototype.constructor = ReaderView;

// Private helpers
// --------
__createRenderer = function(doc, viewName) {
  return new doc.constructor.Renderer(doc, viewName);
};

__createSurface = function(self, doc, viewName) {
  var docCtrl = self.readerCtrl[viewName + "Ctrl"];
  var renderer = __createRenderer(doc, viewName);
  var surface = new Surface(docCtrl, renderer);

  // HACK: it turned out that the Container implementation
  // depends rather strongly on the actual view.
  // I.e., selections are very related to what has actually been rendered -- and how.
  // To break a cycle of dependencies we inject that implementation at this point
  // Note: currently it is important to rebuild the container after the renderer has been run
  // otherwise all views would be null.
  // Maybe we could make the renderer smarter here, by providing the views
  // even if they are not yet integrated by surface.
  // TODO: try to find a cleaner solution
  var __render__ = renderer.render;
  renderer.render = function() {
    var result = __render__.apply(renderer, arguments);
    docCtrl.session.container.rebuild();
    return result;
  };
  docCtrl.session.container.renderer = renderer;

  return surface;
};

__addResourcePanel = function(self, doc, name) {
  var viewName = name+"View";

  self[viewName] = __createSurface(self, doc, name);
  var el = self[viewName].el;

  el.classList.add(name);
  el.classList.add('resource-view');
  el.setAttribute("id", name);
};

module.exports = ReaderView;
