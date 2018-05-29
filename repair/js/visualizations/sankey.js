define(['d3', 'd3-tip', 'cyclesankey'], 
function(d3, d3tip) {
    /**
    *
    * sankey diagram of nodes and links between those nodes, supports cycles
    *
    * @author Christoph Franke
    */
    class Sankey{

        /**
        *
        * set up the sankey diagram
        *
        * @param {Object} options
        * @param {string} options.el        the HTMLElement to render the sankey diagram in
        * @param {string=} options.title    title of the diagram (displayed on top)
        * @param {string=} options.width    width of the diagram, defaults to bounding box of el
        * 
        */
        constructor(options){
            this.el = options.el;
            this.margin = { top: 1, right: 10, bottom: 6, left: 10 };
            this.height = options.height - this.margin.top - this.margin.bottom;
            this.title = options.title;
            this.formatNumber = d3.format(",.0f"),
            this.color = d3.scale.category20();

            this.div = d3.select(this.el);
            this.bbox = this.div.node().getBoundingClientRect();
            this.width = options.width || this.width;
            this.width = this.width - this.margin.left - this.margin.right;
            this.sankey = d3.sankey()
                .nodeWidth(15)
                .nodePadding(10)
                .size([this.width, this.height]);
        }

        format(d) {
            return d3.format(",.0f")(d);
        }

        /**
        * object describing a node
        * 
        * @typedef {Object} Sankey~Nodes
        * @property {string} id                    - unique id
        * @property {string} name                  - name to be displayed
        * @property {Object=} alignToSource        - align a node to the source of the first link going into this node
        * @property {number} [alignToSource.x = 0] - x offset to position of source
        * @property {number} [alignToSource.y = 0] - y offset to position of source
        */

        /**
        * object describing a link between two nodes
        * 
        * @typedef {Object} Sankey~Links
        * @property {number} source - index of source-node
        * @property {string} target - index of target-node
        * @property {number} value  - determines thickness of visualized link, also shown on mouseover/click
        * @property {string} text   - an additional text to be displayed on mouseover/click
        */

        /**
        * render the data
        *
        * @param {Array.<Sankey~Nodes>} nodes - array of nodes
        * @param {Array.<Sankey~Links>} links - array of links, origin and target indices refer to order of nodes
        */
        render( data ) {

            //sankey.nodeAlign(d3.sankeyLeft)
            var _this = this;
            var zoom = {};
            var drag = {};
            var svg = {};
            d3.selectAll("a[data-zoom]").on("click", clicked);
            function clicked() {
                var valueZoom = this.getAttribute("data-zoom");
                if (valueZoom != 0)
                {
                    svg.call(zoom);
                // Record the coordinates (in data space) of the center (in screen space).
                var center0 = zoom.center(), translate0 = zoom.translate(), coordinates0 = coordinates(center0);
                zoom.scale(zoom.scale() * Math.pow(2, +valueZoom));

                // Translate back to the center.
                var center1 = point(coordinates0);
                zoom.translate([translate0[0] + center0[0] - center1[0], translate0[1] + center0[1] - center1[1]]);

                svg.transition().duration(750).call(zoom.event);
                } else {
                    fitZoom();
                }
            }
            
            function fitZoom() {
                svg.transition().duration(500).call(zoom.translate([20,10]).scale(1).event);
            }

            function coordinates(point) {
                var scale = zoom.scale(), translate = zoom.translate();
                return [(point[0] - translate[0]) / scale, (point[1] - translate[1]) / scale];
            }

            function point(coordinates) {
                var scale = zoom.scale(), translate = zoom.translate();
                return [coordinates[0] * scale + translate[0], coordinates[1] * scale + translate[1]];
            }

            var path = this.sankey.link();

            // remove old svg if it was already rendered
            this.div.select("svg").remove();
            d3.select(".d3-tip").remove();

            /* Initialize tooltip */
            var tipLinks = d3tip()
                .attr('class', 'd3-tip d3-tip-links')
                .offset([-10,0]);

            var tipNodes = d3tip()
                .attr('class', 'd3-tip d3-tip-nodes')
                .offset([-10, 0]);
            var linkTooltipOffset = 62,
                nodeTooltipOffset = 130;

            tipLinks.html(function(d) {
                var title = d.source.name + " -> " + d.target.name,
                    value = _this.format(d.value) + " " + (d.units || "");
                return "<h1>" + title + "</h1>" + "<br>" + value + "<br><br>" + d.text;
            });

            tipNodes.html(function(d) {
                var inSum = 0,
                    outSum = 0;
                var inUnits, outUnits;
                for (var i = 0; i < d.targetLinks.length; i++) {
                    var link = d.targetLinks[i];
                    inSum += link.value; 
                    if (!inUnits) inUnits = link.units; // in fact take first occuring unit, ToDo: can there be different units in the future?
                }
                for (var i = 0; i < d.sourceLinks.length; i++) {
                    var link = d.sourceLinks[i];
                    outSum += link.value; 
                    if (!outUnits) outUnits = link.units;
                }
                inSum = Math.round(inSum * 100000) / 1000;
                outSum = Math.round(inSum * 100000) / 1000;
                var ins = "in: " + inSum + " " + (inUnits || ""),
                    out = "out: " + outSum + " " + (outUnits || "");
                return "<h1>" + d.name + "</h1>" + "<br>" + ins + "<br>" + out; 
            });


            function zoomed() {
                svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            }

            function dragstarted(d) {
                d3.select(this).classed("dragging", true);
            }

            function dragged(d) {
                d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
            }

            function dragended(d) {
                d3.select(this).classed("dragging", false);
            }

            drag = d3.behavior.drag()
            .origin(function(d) { return d; })
            .on("dragstart", dragstarted)
            .on("drag", dragged)
            .on("dragend", dragended);

            zoom = d3.behavior.zoom()
                .scaleExtent([0, 5])
                .center([this.width / 2, this.height / 2])
                .on("zoom", zoomed);

            var svg = this.div.append("svg")
                //.attr( "preserveAspectRatio", "xMinYMid meet" )
                .attr("width", this.width)
                .attr("height", this.height)
                .call(zoom)
                .call(tipLinks)
                .call(tipNodes)
                .append("g")
                .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

            this.sankey.nodes(data.nodes)
                .links(data.links)
                .layout(32);

            //var allgraphics = svg.append("g").attr("class", "node-and-link-container" );
            var fontScale = d3.scale.linear().domain(d3.extent(data.nodes, function(d) { return d.value })).range([18, 30]);
            var link = svg.append("g").attr("class", "link-container")
                .selectAll(".link")
                .data(data.links)
            .enter().append("path")
                .attr("class", function(d) { return (d.causesCycle ? "cycleLink" : "link") })
                .attr("d", path)
                .sort(function(a, b) { return b.dy - a.dy; })
                .on('mousemove', function(event) {
                    tipLinks
                        .style("top", function() {
                            var top = d3.event.pageY - $('.d3-tip-links').height() / 2;
                            return top + "px";
                        })
                        .style("left", function () {
                            var left = d3.event.pageX + 20;
                            return left + "px"; })
                        .style("pointer-events", 'none')
                    })
                .on('mouseover', function(d) { tipLinks.show(d, this); })
                .on('mouseout', function(d) { tipLinks.hide(d, this); });

            link.filter( function(d) { return !d.causesCycle} )
                .style("stroke-width", function(d) { return Math.max(1, d.dy); });

            var node = svg.append("g").attr("class", "node-container")
                .selectAll(".node")
                .data(data.nodes)
            .enter().append("g")
                .attr("class", "node")
                .attr("transform", function(d) { 
                    return "translate(" + d.x + "," + d.y + ")"; 
                })
                .on('mousemove', function(event) {
                  tipNodes
                    .style("top", d3.event.pageY - $('.d3-tip-nodes').height() / 2 + "px")
                    .style("left", function () {
                      var left = d3.event.pageX + 20;
                      return left + "px"; })
                    .style("pointer-events", 'none')
                  })
                .on('mouseover', function(d) { tipNodes.show(d, this); })
                .on('mouseout', function(d) { tipNodes.hide(d, this); })
            .call(d3.behavior.drag()
                .origin(function(d) { return d; })
                .on("dragstart", function() { 
                    d3.event.sourceEvent.stopPropagation();  //Disable drag sankey on node select
                    this.parentNode.appendChild(this); })
                .on("drag", dragmove))
            .call(alignToSource);

            node.append("rect")
                .attr("height", function(d) { return d.dy; })
                .attr("width", _this.sankey.nodeWidth())
                .style("fill", function(d) {
                    if (d.color == undefined)
                        return d.color = _this.color(d.name.replace(/ .*/, "")); //get new color if node.color is null
                    return d.color;
                })
                .style("stroke", function(d) { return d3.rgb(d.color).darker(2); });

            node.append("text")
                .attr("x", -6)
                .attr("y", function(d) { return d.dy / 2; })
                .attr("dy", ".35em")
                .attr("text-anchor", "end")
                .attr("transform", null)
                .text(function(d) { return d.name; })
            .filter(function(d) { return d.x < _this.width / 2; })
                .attr("x", 6 + this.sankey.nodeWidth())
                .attr("text-anchor", "start");
                
            function dragmove(d) {
                d3.select(this).attr("transform", 
                    "translate(" + (
                        d.x = Math.max(0, Math.min(_this.width - d.dx, d3.event.x))
                    ) + "," + (
                        d.y = Math.max(0, Math.min(_this.height - d.dy, d3.event.y))
                    ) + ")");
                _this.sankey.relayout();
                link.attr("d", path);
            }

            // align the node to it's source if requested
            function alignToSource() {
                var gNodes = d3.selectAll("g.node");

                for (var j = 0; j < data.nodes.length; j++) {
                    var node = data.nodes[j];
                    if (node.alignToSource != null){
                        var targetLink = node.targetLinks[0];
                        var source = targetLink.source;
                        var offsetX = node.alignToSource.x || 0,
                            offsetY = node.alignToSource.y || 0;
                        node.x = source.x + offsetX;
                        node.y = source.y + targetLink.sy + offsetY;
                        var gNode = gNodes[0][j];
                        d3.select(gNode).attr("transform", 
                            "translate(" + node.x + "," + node.y + ")");
                    }
                }
                _this.sankey.relayout();
                link.attr("d", path);
            }

            fitZoom();

            //var numCycles = 0;
            //for( var i = 0; i< this.sankey.links().length; i++ ) {
                //if( this.sankey.links()[i].causesCycle ) {
                    //numCycles++;
                //}
            //}

            //var cycleTopMarginSize = (this.sankey.cycleLaneDistFromFwdPaths() -
                //( (this.sankey.cycleLaneNarrowWidth() + this.sankey.cycleSmallWidthBuffer() ) * numCycles ) )
            //var horizontalMarginSize = ( this.sankey.cycleDistFromNode() + this.sankey.cycleControlPointDist() );

            //svg.append("text")
                //.attr("x", (this.width / 2))             
                //.attr("y", cycleTopMarginSize / 2 + this.margin.top)
                //.attr("text-anchor", "middle")  
                //.style("font-size", "16px") 
                //.style("text-decoration", "underline")  
                //.text(this.title);

            //svg = d3.select(this.el).select("svg")
                //.attr( "viewBox",
                    //"" + (0 - horizontalMarginSize ) + " "         // left
                    //+ cycleTopMarginSize + " "                     // top
                    //+ (this.width + horizontalMarginSize * 2 ) + " "     // width
                    //+ (this.height + (-1 * cycleTopMarginSize)) + " " );  // height

        };
    };
    return Sankey;
});