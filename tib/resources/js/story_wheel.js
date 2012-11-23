/**
 * Construct the StoryWheel object.
 *
 * @param {Object} config Config options for this class. Requires height and width
 * @param {Object} data The JSON returned by the server.
 * @constructor
 */
tib.vis.StoryWheel = function StoryWheel(config, data) {

    var self = this;
    $.extend(this, config);

    // Build the inverse prominence tree
    var initData = function(data) {
        var wordNamesForId = {};
        var invProm = {};

        // Build a list of word names by ID for later
        for (var id in data.markers.concepts) {
            var w = data.markers.concepts[id];
            wordNamesForId[w.id] = w.value;
        }

        // Start by building a flat list of nodes. Each node has a list of its children and its parent
        // We fake an array by using a length property so we can iterate it later.
        var node_list = {length: 0};
        for (var i = 0; i < data.markers.iprom.length; i++) {
            // Each item in the list is an edge, it consists of a to and a from.
            // The from is the parent, the to the sibling.
            // First, add the 'to' part of the edge to the child list of the from part (its parent),
            // Create an entry in the list for the from if it doesn't already exist.
            var edge = data.markers.iprom[i];
            if (node_list[edge.from] !== undefined) {
                node_list[edge.from].children.push(edge.to);
            } else {
                node_list[edge.from] = {
                    children: [edge.to]
                };
                node_list.length += 1;
            }
            // Secondly, add the 'to' aspect of the edge to the list, setting its parent.
            // The weight for the edge should also go here.
            if (node_list[edge.to] !== undefined) {
                node_list[edge.to].parent = edge.from;
                node_list[edge.to].weight = edge.weight;
            } else {
                node_list[edge.to] = {
                    parent: edge.from,
                    id: edge.to,
                    children: []
                };
                node_list.length += 1;
            }
        }
        // Now build it into a tree
        var treeBuilder = function(nodeId) {
            // The node to be returned
            var tree = {
                name: wordNamesForId[nodeId],
                weight: node_list[nodeId].weight,
                children: []
            };
            // Add the children for this node
            for (var i = 0; i < node_list[nodeId].children.length; i++) {
                tree.children.push(treeBuilder(node_list[nodeId].children[i]));
            }
            return tree;
        };
        for (var j = 0; j < node_list.length; j++) {
            if (node_list[j].parent === undefined) {
                // This node has no parent - it must be the root of the tree
                invProm = {
                    name: wordNamesForId[j],
                    children: []
                };
                // Add the children for this node
                for (var k = 0; k < node_list[j].children.length; k++) {
                    invProm.children.push(treeBuilder(node_list[j].children[k]));
                }
                break;
            }
        }
        return {
            tree: invProm
        };
    };
    $.extend(this, initData(data));

    /**
     * Draw the concept cloud visualisation.
     */
    this.draw = function () {
        generate();
    };

    // Do the actual drawing work
    var generate = function() {
        var diameter = self.height;

        var tree = d3.layout.tree()
            .size([360, diameter / 2 - 120])
            .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

        var diagonal = d3.svg.diagonal.radial()
            .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });

        var svg = d3.select("#vis-canvas").append("svg")
            .attr("width", diameter)
            .attr("height", diameter - 150)
            .append("g")
            .attr("transform", "translate(" + diameter / 2 + "," + diameter / 2 + ")");

        var nodes = tree.nodes(self.tree),
            links = tree.links(nodes);

        var link = svg.selectAll(".link")
            .data(links)
            .enter().append("path")
            .style("fill", "none")
            .style("stroke", "#ccc")
            .style("stroke-width", "1.5px")
            .attr("d", diagonal);

        var node = svg.selectAll(".node")
            .data(nodes)
            .enter().append("g")
            .style("font", "10px sans-serif")
            .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")"; });

        node.append("circle")
            .attr("r", 4.5)
            .style("fill", "#fff")
            .style("stroke", "steelblue")
            .style("stroke-width", "1.5px");

        node.append("text")
            .attr("dy", ".31em")
            .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
            .attr("transform", function(d) { return d.x < 180 ? "translate(8)" : "rotate(180)translate(-8)"; })
            .text(function(d) { return d.name; });
    };

    /**
     * Activate this vis. All we do is resize the container and draw it.
     */
    this.activate = function() {
        $('#' + self.drawTarget).css('width', String(self.width) + 'px');
        self.draw();
    };

    /**
     * Destroy this vis. Just remove the SVG from the DOM.
     */
    this.destroy = function() {
        // Remove the SVG element
        $('#' + self.drawTarget + 'svg').remove();
    };
};