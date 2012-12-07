/**
 * Construct the CorrelationWheel object.
 *
 * @param {Object} config Config options for this class. Requires height and width
 * @param {Object} data The JSON returned by the server.
 * @constructor
 */
tib.vis.CorrelationWheel = function CorrelationWheel(config, data) {

    var self = this;
    $.extend(this, config);

    /////////////////
    // Setup class properties
    /////////////////
    // Defaults
    this.arcWidth = 20;
    this.arcPadding = 4;
    this.numLinks = 200;

    // Build the inverse prominence tree
    var initData = function(data) {
        var wordNamesForId = {};
        var nodeList = [];

        // Build a list of word names by ID for later
        for (var id in data.markers.concepts) {
            var w = data.markers.concepts[id];
            wordNamesForId[w.id] = w.value;

        }

        // Add list of related concepts edge list from related items
        for (var id in data.markers.concepts) {
            var w = data.markers.concepts[id];
            var node = {
                name: w.value,
                key: parseInt(w.id, 10),
                themeId: parseInt(w.themeId, 10),
                weight: parseFloat(w.weight)
            };
            var related = []
            for (var rId in data.markers.concepts[id].related) {
                var r = data.markers.concepts[id].related[rId];
                related.push({
                    key: parseInt(r.id, 10),
                    name: wordNamesForId[r.id],
                    strength: r.strength,
                    count: r.count,
                    prom: r.prom
                });
            }
            node['related'] = related;
            nodeList.push(node);
        }


        return {
            nodes: {
                children: nodeList,
                name: 'blah',
                key: 'blah'
            }
        };
    };
    $.extend(this, initData(data));

    /**
     * Export story wheel as PNG data url.
     */
    this.asPNG = function () {
        alert('Not yet implemented'); 
    };

    /**
     * Draw this visualisation.
     */
    this.draw = function () {
        
        if (!this.drawn) {
            $('#' + self.drawTarget).css('width', String(self.width) + 'px');
            this.initHelp();
        }

        generate();
        $('#vis-types li.correlation-wheel').addClass('active');
        
        this.drawn = true;
    };

    // Do the actual drawing work
    var generate = function() {
        var w = self.width,
            h = self.height,
            rx = w / 2,
            ry = h / 2,
            rotate = 0;

        // Calculate the links from the nodes
        var calcLinks = function (nodes) {
            var nodeList = {};
            var links = [];
            var splines = [];

            nodes.forEach(function (node) {
                nodeList[node.name] = node;
            });
            console.log(nodeList, nodeList.length);

            nodes.forEach(function (node) {
                if (node.related) {
                    node.related.forEach(function (rel) {
                        links.push({
                            source: nodeList[node.name],
                            target: nodeList[rel.name],
                            prom: rel.prom,
                            strength: rel.strength,
                            count: rel.count
                        });
                        splines.push([nodeList[node.name], [rel.name]]);
                    });
                }
            });
            links.sort(function (a, b) { return b.prom - a.prom });

            return links.splice(0, self.numLinks);
        };

        // Calculate the splines from the links
        var calcSplines = function (links) {
            var splines = [];

            links.forEach(function (link) {
                var x1 = link.source.x;
                var x2 = link.target.x;
                var y = (1 - Math.round(Math.sin(0.5 * Math.abs(x2 - x1) * Math.PI / 180) * 100) / 100) * link.source.y;
                var midpoint = {
                    x: Math.abs(x2 - x1) > 180 ? (x1 + x2) / 2 + 180 : (x1 + x2) / 2,
                    y: y
                };
                splines.push([link.source, midpoint, link.target]);
            });

            return splines;
        };

        // Generate the Arc data
        var calcArcs = function (nodes) {
            var sortedNodes = [];
            var arcs = [];

            nodes.forEach(function (node) {
                if (sortedNodes[node.themeId] === undefined) {
                    sortedNodes[node.themeId] = [];
                }
                sortedNodes[node.themeId].push(node.x);
            });
            console.log(sortedNodes);

            for (var i in sortedNodes) {
                var max = sortedNodes[i][0],
                    min = sortedNodes[i][0];

                for (var j = 1; j < sortedNodes[i].length; j++) {
                    var angle = sortedNodes[i][j];
                    if (angle > max) {
                        max = angle;
                    }
                    if (angle < min) {
                        min = angle
                    }
                }
                // Need to adjust slightly. Angles end up in the middle of words
                arcs.push({startAngle: (min - 1) * Math.PI / 180, endAngle: (max + 1) * Math.PI / 180});
            }

            return arcs
        };

        var cluster = d3.layout.cluster()
            .size([360, ry - 120])
            .sort(function(a, b) { return (a.themeId * 1000 + a.weight * -1) - (b.themeId * 1000 + b.weight * -1); });

        // Connect lines
        var line = d3.svg.line.radial()
            .interpolate("bundle")
            .tension(1)
            .radius(function(d) { return d.y - (self.arcWidth + self.arcPadding * 2); })
            .angle(function(d) { return d.x / 180 * Math.PI; });

        // Details for the Arc
        var arcInner = ry - 120 - self.arcWidth - self.arcPadding;
        var arcOuter = arcInner + self.arcWidth;
        var colour = d3.scale.category10();
        var arc = d3.svg.arc().innerRadius(arcInner).outerRadius(arcOuter);

        self.selector =  d3.select('#' + self.drawTarget).append("svg");
        var container = self.selector.attr("width", w)
            .attr("height", h)
        .append("svg:g")
            .attr("transform", "translate(" + rx + "," + ry + ")");

        var nodes = cluster.nodes(self.nodes);
        var links = calcLinks(self.nodes['children']);
        var splines = calcSplines(links);

        var path = container.selectAll("path.link")
            .data(links)
        .enter().append("svg:path")
            .attr("class", function(d) { return "link source-" + d.source.key + " target-" + d.target.key; })
            .style('fill', 'none')
            .style('stroke', '#1f77b4')
            .style('stroke-opacity', 0.4)
            .style('pointer-events', 'none')
            .attr("d", function(d, i) { return line(splines[i]); });

        container.selectAll("g.node")
            .data(nodes.filter(function(n) { return !n.children; }))
        .enter().append("svg:g")
            .attr("class", "node")
            .attr("id", function(d) { return "node-" + d.key; })
            .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; })
        .append("svg:text")
            .attr("dy", ".31em")
            .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
            .attr("transform", function(d) { return d.x < 180 ? null : "rotate(180)"; })
            .style('font-size', '10px')
            .text(function(d) { return d.name; })
            .on("mouseover", function (d) {
                self.selector.selectAll("path.link.target-" + d.key)
                    .style("stroke-width", 2)
                    .style("stroke", "#000");
                self.selector.selectAll("path.link.source-" + d.key)
                    .style("stroke-width", 2)
                    .style("stroke", "#000");
            })
            .on("mouseout", function (d) {
                self.selector.selectAll("path.link.source-" + d.key)
                    .style("stroke-width", 1)
                    .style("stroke", "#1f77b4");

                self.selector.selectAll("path.link.target-" + d.key)
                    .style("stroke-width", 1)
                    .style("stroke", "#1f77b4");
            });

        // Draw the theme arcs

        container.selectAll("path.arc")
            .data(calcArcs(self.nodes['children']))
        .enter().append("svg:path")
            .style('fill', function (d, i) { return colour(i); })
            .attr("d", function(d) { return arc(d); });

    };

    // Create the body content for the help modal.
    this.initHelp = function () {
        // Place to inject
        var modal = '<h3>Correlation Wheel</h3>'+
                    '<p>This visualisation is inspired by Wordle but it has a little <a href="http://leximancer.com" target="_blank">Leximancer</a> magic sprinkled on top.</p>'+
                    '<p>In this visualisation, the concepts are positioned randomly to keep the visualisation nice and compact. The size of a concept dentones how frequent it is within the text.</p>'+
                    '<p>Unlike Wordle, the Concept Cloud groups concepts into <em>themes</em>. Themes are denoted by colour. Concepts that have the same colour belong to the same theme and are cloesly related. You can select the colours you want to use under the colour menu. Some colours work better with the Concept Cloud, others work better with the Concept Web.</p>' +
                    '<p>There is one cavaet with theme colouring you should be aware of. The number of themes identified by Leximancer depends on the number of concepts found which in turn depends on your text. The available colour schemse define between 8 and 10 colours. If there are are more themes then there is colours in your selected scheme, the remaining themes will be coloured grey. This can cause confusion with colour schemes them themselves contain grey.</p>';
        $('#vis-help .modal-body').append(modal);
    };


    /**
     * Destroy this vis. Just remove the SVG from the DOM.
     */
    this.destroy = function() {
        // Remove the SVG element
        this.selector.remove().remove();
        $('#vis-types li').removeClass('active');
    };
};