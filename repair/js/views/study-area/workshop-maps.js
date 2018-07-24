define(['views/baseview', 'backbone', 'underscore',
        'collections/gdsecollection', 'visualizations/map',
        'app-config', 'openlayers', 'patternfly-bootstrap-treeview',
        'patternfly-bootstrap-treeview/dist/bootstrap-treeview.min.css'],

function(BaseView, Backbone, _, GDSECollection, Map, config, ol){
/**
*
* @author Christoph Franke
* @name module:views/BaseMapsView
* @augments module:views/BaseView
*/
var BaseMapsView = BaseView.extend(
    /** @lends module:views/BaseMapsView.prototype */
    {

    includedOnly: true,
    categoryBackColor: '#aad400',
    categoryColor: 'white',
    categoryExpanded: false,
    selectedBackColor: null,
    selectedColor: null,
    onhoverColor: null,
    hierarchicalCheck: true,
    allowReselect: true,
    preventUnselect: true,

    /**
    * render view on map layers of casestudy
    *
    * @param {Object} options
    * @param {HTMLElement} options.el                          element the view will be rendered in
    * @param {string} options.template                         id of the script element containing the underscore template to render this view
    * @param {module:models/CaseStudy} options.caseStudy       the casestudy to add layers to
    *
    * @constructs
    * @see http://backbonejs.org/#View
    */
    initialize: function(options){
        BaseMapsView.__super__.initialize.apply(this, [options]);
        var _this = this;
        // make sure 'this' references to this view when functions are called
        // from different context
        _.bindAll(this, 'nodeSelected');
        _.bindAll(this, 'nodeUnselected');
        _.bindAll(this, 'nodeChecked');
        _.bindAll(this, 'nodeUnchecked');
        _.bindAll(this, 'nodeCollapsed');
        _.bindAll(this, 'nodeExpanded');

        this.template = options.template;
        this.caseStudy = options.caseStudy;

        this.projection = 'EPSG:4326';

        this.wmsResources = new GDSECollection([], { 
            apiTag: 'wmsresources',
            apiIds: [ this.caseStudy.id ]
        });
        this.layerCategories = new GDSECollection([], { 
            apiTag: 'layerCategories',
            apiIds: [ this.caseStudy.id ]
        });

        this.categoryTree = {};
        this.layerPrefix = 'service-layer-';
        this.legendPrefix = 'layer-legend-';

        this.loader.activate();
        this.layerCategories.fetch({ success: function(){
            _this.loader.deactivate();
            _this.initTree();
        }})
        this.lastNode = null;
    },

    /*
    * dom events (managed by jquery)
    */
    events: {
    },
    
    // determines if a layer is checked on start (stored in session for workshop mode)
    isChecked: function(layer){
        var checked = config.session.get('checkedMapLayers');
        if (!checked) return false;
        return checked.includes(layer.id);
    },

    initTree: function(){
        var _this = this;
        var promises = [],
            layerList = [];
        queryParams = (this.includedOnly) ? {included: 'True'} : {};
        // put nodes for each category into the tree and prepare fetching the layers
        // per category
        this.layerCategories.each(function(category){
            var layers = new GDSECollection([], { 
                apiTag: 'layers',
                apiIds: [ _this.caseStudy.id, category.id ]
            });
            layers.categoryId = category.id;
            var node = {
                text: category.get('name'),
                category: category,
                state: { checked: undefined },
                backColor: _this.categoryBackColor || null,
                color: _this.categoryColor || null
            };
            _this.categoryTree[category.id] = node;
            layerList.push(layers);
            promises.push(layers.fetch({ data: queryParams }));
        });
        // fetch prepared layers and put informations into the tree nodes
        Promise.all(promises).then(function(){
            layerList.forEach(function(layers){
                var catNode = _this.categoryTree[layers.categoryId],
                    children = [];
                layers.each(function(layer){
                    var node = {
                        layer: layer,
                        text: layer.get('name'),
                        icon: 'fa fa-bookmark',
                        state: { checked: _this.isChecked(layer) }
                    };
                    children.push(node);
                });
                catNode.nodes = children;
            });
            _this.render();
        })
    },
    
    // store checked layers in session
    saveSession(){
        var checkedItems = $(this.layerTree).treeview('getChecked'),
            checkedIds = [];
        checkedItems.forEach(function(item){
            if(item.layer)
                checkedIds.push(item.layer.id);
        })
        config.session.save({ checkedMapLayers: checkedIds });
    },

    /*
    * render the view
    */
    render: function(){
        this.renderTemplate();
        this.renderMap();
        this.renderDataTree();
        if (this.categoryExpanded) $(this.layerTree).treeview('collapseAll', { silent: false });
    },

    renderTemplate: function(){
        var html = document.getElementById(this.template).innerHTML,
            template = _.template(html);
        this.el.innerHTML = template();
        this.layerTree = document.getElementById('layer-tree');
        this.legend = document.getElementById('legend');
    },

    /*
    * render the hierarchic tree of layers, preselect category with given id (or first one)
    */
    renderDataTree: function(categoryId){
        if (Object.keys(this.categoryTree).length == 0) return;

        var _this = this;
        var dataDict = {};
        var tree = [];

        _.each(this.categoryTree, function(category){
            tree.push(category)
        })
        $(this.layerTree).treeview({
            data: tree, showTags: true,
            selectedBackColor: this.selectedBackColor,
            selectedColor: this.selectedColor,
            expandIcon: 'glyphicon glyphicon-triangle-right',
            collapseIcon: 'glyphicon glyphicon-triangle-bottom',
            onNodeSelected: this.nodeSelected,
            onNodeUnselected: this.nodeUnselected,// function(event, node){ select(event, node, true) },
            onNodeChecked: this.nodeChecked,
            onNodeUnchecked: this.nodeUnchecked,
            onNodeCollapsed: this.nodeCollapsed, //function(event, node){ select(event, node, false) },
            onNodeExpanded: this.nodeExpanded,//function(event, node){ select(event, node, false) },
            showCheckbox: true,
            multiSelect: false,
            onhoverColor: this.onhoverColor,
            hierarchicalCheck: this.hierarchicalCheck,
            allowReselect: this.allowReselect,
            preventUnselect: this.preventUnselect
        });

        // look for and expand and select node with given category id
        if (categoryId != null){
            var nodes = $(this.layerTree).treeview('getNodes');
            _.forEach(nodes, function(node){
                if (node.category && (node.category.id == categoryId)){
                    $(_this.layerTree).treeview('selectNode', node);
                    return false;
                }
            })
        }
    },
    
    toggleState: function(node){
    
        var nodes = $(this.layerTree).treeview('getNodes'),
            _node = null;
        nodes.forEach(function(n){
            if (node.nodeId == n.nodeId) {
                _node = n;
            }
        })
        // expand on click
        if (node.category){
            $(this.layerTree).treeview('toggleNodeExpanded', _node);
        }

        // check/uncheck layer on click
        else {
            $(this.layerTree).treeview('toggleNodeChecked', _node);
        }
    },

    nodeSelected: function(event, node){
        this.toggleState(node);
    },

    nodeUnselected: function(event, node){
    },

    nodeChecked: function(event, node){
        var _this = this;
        if (node.layer){
            this.map.setVisible(this.layerPrefix + node.layer.id, true);
            var legendDiv = document.getElementById(this.legendPrefix + node.layer.id);
            if (legendDiv) legendDiv.style.display = 'block';
            this.saveSession();
        }
    },

    nodeUnchecked: function(event, node){
        var _this = this;
        if (node.layer){
            this.map.setVisible(this.layerPrefix + node.layer.id, false);
            var legendDiv = document.getElementById(this.legendPrefix + node.layer.id);
            if (legendDiv) legendDiv.style.display = 'none';
            this.saveSession();
        }
    },

    nodeCollapsed: function(event, node){

    },

    nodeExpanded: function(event, node){

    },

    renderMap: function(){
        var _this = this;
        this.map = new Map({
            el: document.getElementById('base-map'),
            renderOSM: false
        });
        var focusarea = this.caseStudy.get('properties').focusarea;

        // add polygon of focusarea to both maps and center on their centroid
        if (focusarea != null){
            var poly = new ol.geom.Polygon(focusarea.coordinates[0]);
            this.map.centerOnPolygon(poly, { projection: this.projection });
        };
        // get all layers and render them
        Object.keys(this.categoryTree).forEach(function(catId){
            var children = _this.categoryTree[catId].nodes;
            children.forEach(function(node){ _this.addServiceLayer(node.layer) } );
        })
    },

    addServiceLayer: function(layer){
        this.map.addServiceLayer(this.layerPrefix + layer.id, {
            opacity: 1,
            zIndex: layer.get('z_index'),
            visible: this.isChecked(layer),
            url: config.views.layerproxy.format(layer.id),
            //params: {'layers': layer.get('service_layers')}//, 'TILED': true, 'VERSION': '1.1.0'},
        });
        var uri = layer.get('legend_uri');
        if (uri) {
            var legendDiv = document.createElement('li'),
                head = document.createElement('b'),
                img = document.createElement('img');
            legendDiv.id = this.legendPrefix + layer.id;
            head.innerHTML = layer.get('name');
            img.src = uri;
            var itemsDiv = this.legend.querySelector('.items');
            itemsDiv.appendChild(legendDiv);
            legendDiv.appendChild(head);
            legendDiv.appendChild(document.createElement('br'));
            legendDiv.appendChild(img);
            if (!layer.get('included'))
                legendDiv.style.display = 'none';
        }
    },

});
return BaseMapsView;
}
);
