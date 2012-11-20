/**
 * Utility functions.
 */
tib.util = {};

/**
 * Export the visualisation as SVG.
 */
tib.util.downloadSVG = function () {
    var svgContent = $('div#cloud svg').attr("version", "1.1").attr("xmlns", "http://www.w3.org/2000/svg").parent().get(0).innerHTML
    window.open("data:image/svg+xml;charset=utf-8;base64," + btoa(unescape(encodeURIComponent(svgContent))));
};

tib.util.loadData = function (data) {
    
    var cluster = {};
    var mst = [];
    var words = [];
    var wordsForName = {};
    var wordNamesForId = {};
    var invProm = {};
    var minSize = null;
    var maxSize = null;
    for (var id in data.markers.concepts) {
        var w = data.markers.concepts[id];
        words.push(word = {
            edges: w.mstEdges,
            size: w.weight*1,
            text: w.value
        });
        if (minSize == null) {
            minSize = maxSize = word.size;
        }
        else {
            minSize = Math.min(minSize, word.size);
            maxSize = Math.max(maxSize, word.size)
        }
        cluster[word.text] = {
            x: w.x * WIDTH/2,
            y: w.y * HEIGHT/2
        };
        wordNamesForId[w.id] = w.value;
        wordsForName[word.text] = word;
    }
    
    // Sort words by size, decreasing
    words.sort(function (a, b) { return b.size - a.size;});
    
    // Normalise text size and build mst
    for (var i = 0; i < words.length; i++) {
        var word = words[i];
        for (var j = 0; j < word.edges.length; j++) {
            var toWordName = wordNamesForId[word.edges[j].to];
            mst.push({
                x1: cluster[word.text].x,
                y1: cluster[word.text].y,
                x2: cluster[toWordName].x,
                y2: cluster[toWordName].y
            });
        }
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

    return  {
        cluster: cluster,
        mst: mst,
        sizeDomain: [minSize, maxSize],
        words: words,
        wordsForName: wordsForName,
        invProm: invProm
    };
};