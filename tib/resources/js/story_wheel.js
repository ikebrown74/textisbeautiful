
tib.vis.StoryWheel = function StoryWheel(data) {
    /**
     * Draw the concept cloud visualisation.
     */
    this.draw = function () {
        generate();
    };

    var generate = function() {
        var svg = d3.select("#vis-sw").append("svg")
            .attr("width", WIDTH)
            .attr("height", HEIGHT)
            .append("g")
            .attr("transform", "translate(" + HEIGHT / 2 + "," + HEIGHT / 2 + ")");

        var diagonal = d3.svg.diagonal.radial()
            .projection(function(d) { return [d.y, d.x / 180 * Math.PI]; });
        var tree = d3.layout.tree()
            .size([360, HEIGHT]);
        var nodes = tree.nodes(data.invProm);
        var links = tree.links(nodes);
    }

    // Build the inverse prominence tree
    // Start by building a flat list of nodes. Each node has a list of its children and its parent
    // We fake an array by using a length property so we can iterate it later.
    var node_list = {length: 0};
    for (var i = 0; i < data.markers.iprom.length; i++) {
        // Each item in the list is an edge, it consists of a to and a from.
        // The from is the parent, the to the sibling.
        // First, add the 'to' part of the edge to the child list of the from part (its parent),
        // Create an entry in the list for the from if it doesn't already exist.
        if (node_list[data.markers.iprom[i].from] !== undefined) {
            node_list[data.markers.iprom[i].from].children.push(data.markers.iprom[i].to);
        } else {
            node_list[data.markers.iprom[i].from] = {
                children: [data.markers.iprom[i].to]
            };
            node_list.length += 1;
        }
        // Secondly, add the 'to' aspect of the edge to the list, setting its parent.
        // The weight for the edge should also go here.
        if (node_list[data.markers.iprom[i].to] !== undefined) {
            node_list[data.markers.iprom[i].to].parent = data.markers.iprom[i].from;
            node_list[data.markers.iprom[i].to].weight = data.markers.iprom[i].weight;
        } else {
            node_list[data.markers.iprom[i].to] = {
                parent: data.markers.iprom[i].from,
                id: data.markers.iprom[i].to,
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
    for (var i = 0; i < node_list.length; i++) {
        if (node_list[i].parent === undefined) {
            // This node has no parent - it must be the root of the tree
            invProm = {
                name: wordNamesForId[i],
                children: []
            };
            // Add the children for this node
            for (var j = 0; j < node_list[i].children.length; i++) {
                invProm.children.push(treeBuilder(node_list[i].children[j]));
            }
            break;
        }
    }
}