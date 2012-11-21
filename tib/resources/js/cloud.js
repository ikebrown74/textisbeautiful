/**
 * Cloud visualisation.
 */

/// IN PROGRESS
///////////////////
/// TODO
//// - Colours/themes
//// - Prefer positioning based on relatedness (test alphabetically)?
//// - Font sizing scale options
//// - More orientations
//// - Word limit
//////////////////

tib.vis.cloud = {};

// Word orientations
tib.vis.cloud.ORIENTATIONS = {
    'Messy' : [5, 30, 60],
    'Horizontal' : [0, 0, 0],
    'Vertical' : [0, 0, 90]
};

// Canvas dimensions
tib.vis.cloud.DIMENSIONS = {
    width: 900,
    height: 500,
    padding: 0
};

// Cloud defaults
tib.vis.cloud.DEFAULTS = {
    bold: false,
    italic: false,
    fill: d3.scale.category20(),
    font: 'Trebuchet MS',
    fontSize: d3.scale.pow().range([8, 160]),
    mode: 'Archimedean',
    orientation: tib.vis.cloud.ORIENTATIONS['Horizontal'],
    webMode: false,
    words: []
}

/**
 * Encapsulates the Concept Cloud visualisation.
 */
tib.vis.ConceptCloud = function ConceptCloud (data) {
    
    $.extend(this, tib.vis.cloud.DEFAULTS);
    $.extend(this, tib.vis.cloud.DIMENSIONS);
    
    this.layout = null;
    var self = this;

    /*
     * Create the data structures need for this vis from the JSON the server returned.
     */
    var loadData = function(data) {
        var cluster = {};
        var mst = [];
        var words = [];
        var wordsForName = {};
        var wordNamesForId = {};
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
                x: w.x * self.width/2,
                y: w.y * self.height/2
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
    $.extend(this, loadData(data));
    this.fontSize.domain(this.sizeDomain);

    /**
     * Export cloud as image/png.
     */
    this.downloadPNG = function () {
        
        // Use canvas to generate png data
        var canvas = document.createElement("canvas"),
            c = canvas.getContext("2d");
        canvas.width = self.width;
        canvas.height = self.height;
        c.translate(self.width >> 1, self.height >> 1);
        c.scale(1, 1);
        
        var self = this;
        
        // Links
        d3.selectAll('div#vis-cloud svg path').each(function (line) {
            c.strokeStyle = "#ccc";
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(line.x1, line.y1);
            c.lineTo(line.x2, line.y2);
            c.stroke();
            c.closePath();
        });
        
        // Words
        d3.selectAll("div#vis-cloud svg text").each(function (word) {
            c.save();
            if (self.webMode) {
                c.translate(self.cluster[word.text].x, self.cluster[word.text].y);
                c.font = getFontSizeForWeb(word.size) + "px " + word.font;
            }
            else {
                c.translate(word.x, word.y);
                c.font = word.size + "px " + word.font;
            }
            c.rotate(word.rotate * Math.PI / 180);
            c.textAlign = "center";
            c.fillStyle = word.fill
            c.fillText(word.text, 0, 0);
            c.restore();
        });
        
        window.open(canvas.toDataURL("image/png"));
    }
    
    /**
     * Export cloud as svg.
     */
    this.downloadSVG = function () {
        tib.util.downloadSVG();
    };
    
    /**
     * Draw the concept cloud visualisation.
     */
    this.draw = function () {
        generate();
    };
    
    /**
     * Select a font for the cloud.
     */
    this.selectFont = function (font) {
        if (font != this.font) {
            this.font = font;
            if (this.webMode) {
                d3.selectAll('div#vis-cloud svg text').style('font-family', font);
            }
            else {
                this.draw();    
            }
        }
    };
    
    /**
     * Toggle style attribute (bold, italic).
     */
    this.toggleStyle = function (name) {
        name = name.toLowerCase();
        var self = this;
        if (name == 'bold' || name == 'italic') {
            this[name] = !this[name];
            if (this.webMode) {
                d3.selectAll('div#vis-cloud svg text')
                    .style("font-style", self.italic ? 'italic' : 'normal')
                    .style("font-weight", self.bold ? 'bold' : 'normal')
            }
            else {
                this.draw();    
            }
        }
    };
    
    /**
     * Toggle concept web visualisation mode.
     */
    this.toggleWeb = function () {
        
        if (this.webMode) {
            $('#cloud-layout-menu').hide();
            $('#cloud-btn-refresh').hide();
        }
        else {
            $('#cloud-layout-menu').show();
            $('#cloud-btn-refresh').show();
        }
        
        drawSpanningTreeLinks();
            
        d3.selectAll("div#vis-cloud svg text").transition()
            .duration(750)
            .style("font-size", function(d) { return (self.webMode ? getFontSizeForWeb(d.size) : d.size) + "px"; })
            .attr("transform", function(d) {
                var x = self.webMode ? self.cluster[d.text].x : d.x;
                var y = self.webMode ? self.cluster[d.text].y : d.y;
                return "translate(" + [x, y] + ")rotate(" + (self.webMode ? 0 : d.rotate) + ")";
            });
    };
    
    // Draw the links for the MST.
    var drawSpanningTreeLinks = function () {
        d3.selectAll("div#vis-cloud svg path").remove();
        if (self.webMode) {
            d3.select("div#vis-cloud svg").selectAll("path")
                .data(self.mst)
                .enter().insert("path", ":first-child")
                .attr("d", function (d) { return "M " + d.x1 + ", " + d.y1 + " L" + d.x2 + ", " + d.y2})
                .attr("transform", "translate(" + self.width/2 + "," + self.height/2 + ")")
                .style("stroke-width", 1)
                .style("stroke", "#ccc")
                .style("fill", "none");
        }
    };
    
    // Render the words
    var drawWords = function (words) {
        self.renderedWords = words;
        $('div#vis-cloud').empty();
            d3.select("div#vis-cloud").append("svg")
                .attr("width", self.width)
                .attr("height", self.height)
                .append("g")
                    .attr("transform", "translate(" + self.width/2 + "," + self.height/2 + ")")
                    .selectAll("text")
                    .data(words)
                    .enter().append("text")
                        .style("font-size", function(d) { return d.size + "px"; })
                        .style("font-family", self.font)
                        .style("font-style", self.italic ? 'italic' : 'normal')
                        .style("font-weight", self.bold ? 'bold' : 'normal')
                        .style("fill", function(d, i) { d.fill = self.fill(i); return d.fill; })
                        .attr("text-anchor", "middle")
                        .attr("transform", function(d) {
                            return "translate(" + [self.webMode ? self.cluster[d.text].x : d.x, self.webMode ? self.cluster[d.text].y : d.y] + ")rotate(" + (self.webMode ? 0 : d.rotate) + ")";
                        })
                        .text(function(d) { return d.text; });
    };
    
    // Start the D3 drawing process
    var generate = function () {
        self.layout = d3.layout.cloud().size([self.width, self.height])
            .words(self.words)
            .rotate(function(d) { return ~~(Math.random() * self.orientation[0]) * self.orientation[1] - self.orientation[2]; })
            .spiral(self.mode.toLowerCase())
            .font(self.font)
            .fontSize(function(d) { return self.fontSize(+d.size); })
            .fontStyle(self.italic ? 'italic' : '')
            .fontWeight(self.bold ? 'bold' : 'normal')
            .on("end", drawWords)
            .start();
    };
    
    // Determine font size for web mode
    var getFontSizeForWeb = function (originalSize) {
        return 2 + 3 * Math.sqrt(originalSize);
    };

    /**
     * Initialise the menu for this vis.
     */
    this.initMenu = function () {

        // Text selection
        var textUI = $('ul#cloud-menu-text');
        // Style
        textUI.append($('<li class="nav-header">Style</li>'));
        textUI.append(
            $('<li class="style"><a href="#" onclick="tib.vis.toggleStyle(this, \'bold\');" style="font-weight:bold">Bold</a></li>'),
            $('<li class="style"><a href="#" onclick="tib.vis.toggleStyle(this, \'italic\');" style="font-style:italic">Italic</a></li>')
        );
        // Font
        textUI.append($('<li class="nav-header">Font</li>'));
        $(tib.uic.FONTS).each(function (i, font) {
            var listEl = $('<li class="font"><a href="#" onclick="tib.vis.selectFont(this);" style="font-family:' + font + '">' + font + '</a></li>');
            if (font == tib.vis.cloud.DEFAULTS.font) {
                listEl.addClass('active')
            }
            textUI.append(listEl);
        });

        // Layout selection
        var layoutUI = $('ul#cloud-menu-layout');
        // Mode
        layoutUI.append($('<li class="nav-header">Cloud Shape</li>'));
        $(['Archimedean', 'Rectangular']).each(function (i, mode) {
            var listEl = $('<li class="mode"><a href="#" onclick="tib.vis.selectMode(this,\'' + mode + '\');">' + mode.replace('Archimedean', 'Circular') + '</a></li>');
            if (mode == tib.vis.cloud.DEFAULTS.mode) {
                listEl.addClass('active')
            }
            layoutUI.append(listEl);
        });
        // Orientation
        layoutUI.append($('<li class="nav-header">Word Orientation</li>'));
        $.each(tib.vis.cloud.ORIENTATIONS, function (key, value) {
            var listEl = $('<li class="orientation"><a href="#" onclick="tib.vis.selectOrientation(this);">' + key + '</a></li>');
            if (value == tib.vis.cloud.DEFAULTS.orientation) {
                listEl.addClass('active')
            }
            layoutUI.append(listEl);
        });

        $('#cloud-menu').show();
    };

    return this;
};