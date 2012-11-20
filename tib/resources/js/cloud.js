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

tib.cloud = {};

// Word orientations
tib.cloud.ORIENTATIONS = {
    'Messy' : [5, 30, 60],
    'Horizontal' : [0, 0, 0],
    'Vertical' : [0, 0, 90]
};

// Cloud defaults
tib.cloud.DEFAULTS = {
    bold: false,
    italic: false,
    fill: d3.scale.category20(),
    font: 'Trebuchet MS',
    fontSize: d3.scale.pow().range([8, 160]),
    mode: 'Archimedean',
    orientation: tib.cloud.ORIENTATIONS['Horizontal'],
    webMode: false,
    words: []
}

/**
 * Encapsualtes the Concept Cloud visualisation.
 */
tib.cloud.ConceptCloud = function ConceptCloud (data) {
    
    $.extend(this, tib.cloud.DEFAULTS);
    $.extend(this, data);
    this.fontSize.domain(this.sizeDomain);
    
    this.layout = null;
    var self = this;
    
    /**
     * Export cloud as image/png.
     */
    this.downloadPNG = function () {
        
        // Use canvas to generate png data
        var canvas = document.createElement("canvas"),
            c = canvas.getContext("2d");
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        c.translate(WIDTH >> 1, HEIGHT >> 1);
        c.scale(1, 1);
        
        var self = this;
        
        // Links
        d3.selectAll('div#cloud svg path').each(function (line) {
            c.strokeStyle = "#ccc";
            c.lineWidth = 1;
            c.beginPath();
            c.moveTo(line.x1, line.y1);
            c.lineTo(line.x2, line.y2);
            c.stroke();
            c.closePath();
        });
        
        // Words
        d3.selectAll("div#cloud svg text").each(function (word) {
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
                d3.selectAll('div#cloud svg text').style('font-family', font);
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
                d3.selectAll('div#cloud svg text')
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
            $('#layout-menu').hide();
            $('#refresh-btn').hide();
        }
        else {
            $('#layout-menu').show();
            $('#refresh-btn').show();
        }
        
        drawSpanningTreeLinks();
            
        d3.selectAll("div#cloud svg text").transition()
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
        d3.selectAll("div#cloud svg path").remove();
        if (self.webMode) {
            d3.select("div#cloud svg").selectAll("path")
                .data(self.mst)
                .enter().insert("path", ":first-child")
                .attr("d", function (d) { return "M " + d.x1 + ", " + d.y1 + " L" + d.x2 + ", " + d.y2})
                .attr("transform", "translate(" + WIDTH/2 + "," + HEIGHT/2 + ")")
                .style("stroke-width", 1)
                .style("stroke", "#ccc")
                .style("fill", "none");
        }
    };
    
    // Render the words
    var drawWords = function (words) {
        self.renderedWords = words;
        $('div#cloud').empty();
            d3.select("div#cloud").append("svg")
                .attr("width", WIDTH)
                .attr("height", HEIGHT)
                .append("g")
                    .attr("transform", "translate(" + WIDTH/2 + "," + HEIGHT/2 + ")")
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
        self.layout = d3.layout.cloud().size([WIDTH, HEIGHT])
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
    
    return this;
};