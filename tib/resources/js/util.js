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
    var minSize = null,
        maxSize = null;
    for (id in data.markers.concepts) {
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
    
    return  {
        cluster: cluster,
        mst: mst,
        sizeDomain: [minSize, maxSize],
        words: words,
        wordsForName: wordsForName
    };
};