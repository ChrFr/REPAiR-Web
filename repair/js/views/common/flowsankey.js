define(['views/common/baseview', 'underscore', 'visualizations/sankey',
        'collections/gdsecollection', 'd3', 'app-config', 'save-svg-as-png',
        'file-saver', 'openlayers', 'utils/utils'],

function(BaseView, _, Sankey, GDSECollection, d3, config, saveSvgAsPng,
         FileSaver, ol, utils){

/**
*
* @author Christoph Franke
* @name module:views/FlowSankeyView
* @augments module:views/BaseView
*/
var FlowSankeyView = BaseView.extend(
    /** @lends module:views/FlowSankeyView.prototype */
    {

    /**
    * render flows in sankey diagram
    *
    * @param {Object} options
    * @param {HTMLElement} options.el                   element the view will be rendered in
    * @param {Backbone.Collection} options.origins      origins
    * @param {Backbone.Collection} options.destinations destinations
    * @param {Number=} options.width                    width of sankey diagram (defaults to width of el)
    * @param {Number=} options.height                   height of sankey diagram (defaults to 1/3 of width)
    * @param {Number} options.caseStudyId               id of the casestudy
    * @param {Number} options.keyflowId                 id of the keyflow
    * @param {Backbone.Collection} options.materials    materials
    * @param {boolean=} [options.renderStocks=true]     if false, stocks won't be rendered
    * @param {boolean=} [options.forceSideBySide=false] if true, the network of flows will be represented with sinks and sources only, nodes in between (meaning nodes with in AND out flows) will be split into a sink and source
    * @param {Object=} options.flowFilterParams         parameters to filter the flows with (e.g. {material: 1})
    * @param {Object=} options.stockFilterParams        parameters to filter the stocks with
    * @param {module:collections/GDSECollection}        options.collection the nodes to render
    *
    * @constructs
    * @see http://backbonejs.org/#View
    */
    initialize: function(options){
        FlowSankeyView.__super__.initialize.apply(this, [options]);
        _.bindAll(this, 'toggleFullscreen');
        _.bindAll(this, 'exportPNG');
        _.bindAll(this, 'exportCSV');
        var _this = this;
        this.caseStudyId = options.caseStudyId;
        this.keyflowId = options.keyflowId;
        this.width = options.width || this.el.clientWidth;
        this.height = options.height || this.width / 3;
        this.forceSideBySide = options.forceSideBySide || false;
        this.originLevel = options.originLevel;
        this.destinationLevel = options.destinationLevel;
        this.flows = options.flows;
        this.renderStocks = (options.renderStocks == null) ? true: options.renderStocks;
        this.showRelativeComposition = (options.showRelativeComposition == null) ? true : options.showRelativeComposition;
        this.forceSignum = options.forceSignum || false;
        this.stretchInput = this.el.querySelector('#sankey-stretch');
        if (this.stretchInput) this.stretchInput.value = 1;
        this.anonymize = options.anonymize;
        this.transformedData = this.transformData(this.flows);
        this.render(this.transformedData);
    },

    /*
    * dom events (managed by jquery)
    */
    events: {
        'click a[href="#flow-map-panel"]': 'refreshMap',
        'click .fullscreen-toggle': 'toggleFullscreen',
        'click .export-img': 'exportPNG',
        'click .export-csv': 'exportCSV',
        'click .select-all': 'selectAll',
        'click .deselect-all': 'deselectAll',
        'change #sankey-dblclick': 'changeDblClick',
        'change #sankey-alignment': 'alignSankey',
        'change #sankey-scale': 'scale',
        'change #sankey-stretch': 'stretch'
    },

    /*
    * render the view
    */
    render: function(data){
        var isFullScreen = this.el.classList.contains('fullscreen'),
            width = (isFullScreen) ? this.el.clientWidth : this.width,
            height = (isFullScreen) ? this.el.clientHeight : this.height,
            div = this.el.querySelector('.sankey'),
            _this = this;
        if (div != null)
            this.el.removeChild(div); // this removes the event listeners as well
        div = document.createElement('div');
        div.classList.add('sankey', 'bordered');
        this.el.appendChild(div);
        if (data.links.length === 0){
            div.innerHTML = gettext("No flow data found for applied filters.");
            this.el.classList.add('disabled');
            return;
        }
        this.el.classList.remove('disabled');
        this.sankeyDiv = div;

        var dblclkCheck = this.el.querySelector('#sankey-dblclick');
        this.sankey = new Sankey({
            height: height,
            width: width,
            el: div,
            title: '',
            language: config.session.get('language'),
            selectable: true,
            gradient: false,
            stretchFactor: (this.stretchInput) ? this.stretchInput.value: 1,
            selectOnDoubleClick: (dblclkCheck) ? dblclkCheck.checked : false,
            forceSignum: this.forceSignum
        })

        // redirect the event with same properties
        function redirectEvent(e){
            _this.el.dispatchEvent(new CustomEvent( e.type, { detail: e.detail.originalData }))
        }

        div.addEventListener('linkSelected', redirectEvent);
        div.addEventListener('linkDeselected', redirectEvent);
        this.sankey.render(data);
    },

    /*
    * render sankey-diagram in fullscreen
    */
    toggleFullscreen: function(){
        this.el.classList.toggle('fullscreen');
        this.refresh();
        //this.render(this.transformedData);
    },

    changeDblClick: function(evt){
        this.deselectAll();
        var checked = evt.target.checked;
        this.sankey.selectOnDoubleClick = checked;
        this.sankey.render(this.transformedData);
    },

    alignSankey: function(evt){
        this.deselectAll();
        this.sankey.align(evt.target.value);
        this.sankey.render(this.transformedData);
    },

    scale: function(){
        this.deselectAll();
        this.transformedData = this.transformData(this.flows);
        this.render(this.transformedData);
    },

    stretch: function(evt){
        this.deselectAll();
        this.sankey.stretch(evt.target.value)
        this.sankey.render(this.transformedData)
    },

    refresh: function(options){
        var isFullScreen = this.el.classList.contains('fullscreen'),
            options = options || {},
            width = (isFullScreen) ? this.el.clientWidth : (options.width) ? options.width : this.width,
            height = (isFullScreen) ? this.el.clientHeight : (options.height) ? options.height : this.height;
        this.sankey.setSize(width, height);
        this.sankey.zoomToFit();
    },

    /*
    * transform the models, their links and the stocks to a json-representation
    * readable by the sankey-diagram
    */
    transformData: function(flows){
        var _this = this,
            nodes = [],
            links = [],
            indices = {},
            colorCat = d3.scale.category20(),
            scaleInput = this.el.querySelector('#sankey-scale'),
            norm = (scaleInput) ? scaleInput.value: 1;

        var idx = -1;

        function mapNode(node){
            var id = node.id,
                name = node.name,
                level = node.level,
                code = node.code || node.nace || node.activity__nace,
                geom = node.geom,
                key = level + id;
            if ((_this.anonymize) && (level === 'actor'))
                name = gettext('Actor');
            // we already got this one -> skip it
            if(indices[key] != null)
                return indices[key];
            idx += 1;
            var color = node.color || utils.colorByName(name);
            nodes.push({ id: id, name: name + ' (' + code + ')', color: color, code: code, geom: geom });
            indices[key] = idx;
            return idx;
        }

        function addStock(){
            idx += 1;
            var color = 'darkgray';
            nodes.push({name: 'Stock', color: color, alignToSource: {x: 80, y: 0} });
            return idx;
        }

        function compositionRepr(flow){
            var text = '',
                i = 0,
                fractions = flow.get('materials'),
                totalAmount = flow.get('amount');
            fractions.forEach(function(material){
                var amount = (material.value != null) ? material.value: material.amount;
                if (amount == 0) return;
                if (_this.showRelativeComposition){
                    fraction = amount / totalAmount,
                    value = Math.round(fraction * 100000) / 1000;
                    text += _this.format(value, _this.forceSignum) + '%';
                } else {
                    text += _this.format(amount, _this.forceSignum) + ' ' + gettext('t/year');
                }
                text += ' ' + material.name
                if (material.avoidable) text += ' <i>' + gettext('avoidable') +'</i>';
                if (i < fractions.length - 1) text += '<br>';
                i++;
            })
            return text || ('no composition defined');
        }

        function typeRepr(flow){
            return flow.get('waste') ? 'Waste': 'Product';
        }

        function processRepr(flow){
            return gettext('Process') + ': ' + (flow.get('process') || '-');
        }

        var amounts = flows.pluck('amount'),
            //minAmount = Math.min(...amounts),
            maxAmount = Math.max(...amounts),
            max = 10000,
            normFactor = max / maxAmount;
        flows.forEach(function(flow){
            var value = flow.get('amount');
            // skip flows with zero amount
            if (value == 0) return;
            var origin = flow.get('origin'),
                destination = flow.get('destination'),
                isStock = flow.get('stock');
            if (isStock && !_this.renderStocks) return;
            if (!isStock && origin.id == destination.id) {
                console.log('Warning: self referencing cycle at node ' + origin.name);
                return;
            }
            function normalize(v){
                var normed = Math.log2(1 + Math.abs(v) * normFactor);
                if (v < 0) normed *= -1;
                return normed;
            }
            var source = mapNode(origin),
                target = (!isStock) ? mapNode(destination) : addStock();
            var crepr = compositionRepr(flow),
                amount = flow.get('amount'),
                value = (norm === 'log')? normalize(amount): Math.round(amount);
            links.push({
                id: flow.id,
                originalData: flow,
                amount: amount,
                value: Math.abs(value),
                units: gettext('t/year'),
                source: source,
                target: target,
                color: (flow.color) ? flow.color: source.color,
                isStock: isStock,
                text: processRepr(flow) + '<br><br><u>' + typeRepr(flow) + '</u><br>' + crepr,
                composition: crepr.replace(new RegExp('<br>', 'g'), ' | ')
            });
        })

        var transformed = {nodes: nodes, links: links};
        return transformed;
    },

    selectAll: function(){
        var paths = this.sankeyDiv.querySelectorAll('path'),
            _this = this,
            data = [];
        paths.forEach(function(path){
            path.classList.add('selected');
        })
        // workaround: trigger deselect all first
        this.el.dispatchEvent(new CustomEvent('allDeselected'));
        // only flows that are actually displayed in sankey (not original data)
        this.transformedData.links.forEach(function(link){
            var flow = _this.flows.get(link.id);
            if (flow)
                data.push(flow)
        })
        this.el.dispatchEvent(new CustomEvent('linkSelected', {
            detail: data
        }));
    },

    deselectAll: function(){
        var links = this.sankeyDiv.querySelectorAll('.selected');
        links.forEach(function(link){
            link.classList.remove('selected');
        })
        this.el.dispatchEvent(new CustomEvent('allDeselected'));
    },

    exportPNG: function(){
        var svg = this.sankeyDiv.querySelector('svg');
        saveSvgAsPng.saveSvgAsPng(svg, "sankey-diagram.png", {scale: 2, backgroundColor: "#FFFFFF"});
    },

    exportCSV: function(){
        if (!this.transformedData) return;

        var header = [gettext('origin'), gettext('origin') + '_code', gettext('origin') + '_wkt',
                      gettext('destination'), gettext('destination') + '_code', gettext('destination') + '_wkt',
                      gettext('amount (t/year)'), gettext('composition')],
            rows = [],
            _this = this;
        rows.push(header.join('\t'));
        var geoJSON = new ol.format.GeoJSON(),
            wkt = new ol.format.WKT();

        function geomToWkt(geom){
            var geometry = geoJSON.readGeometry(geom);
            return wkt.writeGeometry(geometry)
        }

        this.transformedData.links.forEach(function(link){
            var origin = link.source,
                destination = link.target,
                originName = origin.name,
                destinationName = (!link.isStock) ? destination.name : gettext('Stock'),
                amount = _this.format(link.amount, _this.forceSignum),
                composition = link.composition;

            var originCode = origin.code,
                destinationCode = (destination) ? destination.code: '',
                originWkt = '',
                destinationWkt = '';

            var originWkt = (origin.geom) ? geomToWkt(origin.geom) : '',
                destinationWkt = (destination.geom) ? geomToWkt(destination.geom) : '';

            var row = [originName, originCode, originWkt, destinationName, destinationCode, destinationWkt, amount, composition];
            rows.push(row.join('\t'));
        });
        var text = rows.join('\r\n');
        var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
        FileSaver.saveAs(blob, "data.csv");
    },

    /*
    * remove this view from the DOM
    */
    close: function(){
        this.undelegateEvents(); // remove click events
        this.unbind(); // Unbind all local event bindings
        this.el.querySelector('.sankey').innerHTML = ''; //empty the DOM element
    },

});
return FlowSankeyView;
}
);
