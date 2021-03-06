/**
 * Encapsulates the Concept Cloud visualisation.
 *
 * @param {Object} config Config options for this class. Requires height and width
 * @param {Object} data The JSON returned by the server.
 * @constructor
 */
tib.vis.ConceptCloud = function ConceptCloud (config, data) {
    
    var FISHEYE_RADIUS = 120;
    var FISHEYE_DISTORTION = 2.5;
    var INACTIVE_THEME_COLOUR = '#bbb';
    
    // Some scary magic numbers for text scaling.
    var TEXT_SCALE = {
        EXP_MAX: 2.00,
        EXP_MIN: 0.80,
        FONT_SIZE_MIN: 8,
        FONT_SIZE_MAX: 160,
        FONT_SIZE_FLOOR: 50,
        MEAN_FACTOR_THRESH: 0.60,
        OPTIONS: ['Automatic', 'Square Root', 'Linear', 'Exponential'],
        RANGE_FACTOR_THRESH: 0.10,
        RANGE_LOWER_THRESH: 100,
        RANGE_UPPER_THRESH: 330
    };

    // Angles for cloud layout. 0 degress is horizontal. Specify in the form:
    // [number intervals, start angle, end angle]
    var ORIENTATIONS = {
        'Horizontal' : [0, 0, 0],
        'Balanced' : [10, -15, 15],
        'Messy' : [12, -60, 60],
        'Vertical' : [0, -90, 90],
        'Vertical + Horizontal' : [2, -90, 0],
        'Madness' : [36, -180, 180]
    };

    /////////////////
    // Setup class properties
    /////////////////
    // Defaults
    this.autoScaleExponent = 1;
    this.bgStyle = 'White';
    this.bold = true;
    this.colourStyle = 'Basic';
    this.italic = false;
    this.fill = d3.scale.category20();
    this.font = 'Trebuchet MS';
    this.fontSize = d3.scale.pow();
    this.mode = 'Archimedean';
    this.orientation = ORIENTATIONS['Horizontal'];
    this.scaleType = 'Automatic';
    this.webMode = false;
    this.words = [];

    $.extend(this, config);

    var self = this;

    /*
     * Create the data structures need for this vis from the JSON the server returned.
     */
    var initData = function(data) {
        
        var cluster = {};
        var words = [];
        var wordsForName = {};
        var wordNamesForId = {};
        var minSize = null;
        var maxSize = null;
        var totalSize = 0;
        for (var id in data.markers.concepts) {
            
            var w = data.markers.concepts[id];
            word = {
                edges: w.mstEdges,
                //size: Math.log(w.frequency),
                size: parseInt(w.weight, 10),
                text: w.value                
            };
            if (w.themeId) {
                word.themeId = w.themeId;
                word.themeConnectivity = data.markers.themes[w.themeId].connectivity;
            }
            words.push(word);
            
            totalSize += word.size;
            
            if (minSize == null) {
                minSize = maxSize = word.size;
            }
            else {
                minSize = Math.min(minSize, word.size);
                maxSize = Math.max(maxSize, word.size)
            }
            
            // Cluster positioning
            cluster[word.text] = {
                x: w.x * self.width/2,
                y: w.y * self.height/2
            };
            
            // Helper data structures
            wordNamesForId[w.id] = w.value;
            wordsForName[word.text] = word;
        }
        
        var sizeRange = maxSize - minSize;
        var mean = totalSize / words.length;
        var count = 0;
        for (var i = 0; i < words.length; i++) {
            w = words[i];
            if (w.size < mean) {
                count++;
            }
        }
        
        // Words below mean relative to all words
        var meanFactor = count / words.length;
        
        // Size range relative to cumulative size
        var rangeFactor = sizeRange / totalSize;
        
        // Word connectivity will hopefully generally take the form of a power-law (or similar) distribution.
        // This will generally present an aesthetically appealing range of font sizes in the cloud.
        // When the distribution does not follow this trend, the cloud may appear aneamic or bloated.
        // What follows below is a very naiive and crude attempt to detect and transform certain types of distributions.
        // We either increase or decrease the exponent (defaults to 1), to perform a non-linear contraction/expansion of the dist.
        if (
            // Too few words below the mean relative to size range.
            meanFactor <= TEXT_SCALE.MEAN_FACTOR_THRESH && sizeRange > TEXT_SCALE.RANGE_LOWER_THRESH
            
            // Text size range is too large. Contract the distribution to decrease it.
            // Hopefully this results in a more predictable, pleasing cloud.
            || sizeRange > TEXT_SCALE.RANGE_UPPER_THRESH
            
            // Unusually small text size range relative to cumulative total of all text sizes.
            // This suggests we have a high concentration of words at the upper range.
            // Things may look better if we expand the size range.
            || sizeRange < TEXT_SCALE.RANGE_LOWER_THRESH && rangeFactor < TEXT_SCALE.RANGE_FACTOR_THRESH
        ) {
            // If sizeRange < upper threshold, then perform expansion, otherwise contraction
            var exponent = TEXT_SCALE.RANGE_UPPER_THRESH / sizeRange;
            // Apply bounds to exponent so we don't do anything too crazy
            exponent = Math.min(TEXT_SCALE.EXP_MAX, exponent);
            exponent = Math.max(TEXT_SCALE.EXP_MIN, exponent);
            self.autoScaleExponent = exponent;
        }

        // Sort words by theme
        words.sort(function (a, b) { return b.themeConnectivity - a.themeConnectivity;});

        // Normalise text size and build mst
        var mst = [];
        for (var i = 0; i < words.length; i++) {
            var word = words[i];
            for (var j = 0; j < word.edges.length; j++) {
                var toWordName = wordNamesForId[word.edges[j].to];
                mst.push({
                    x1: cluster[word.text].x,
                    y1: cluster[word.text].y,
                    x2: cluster[toWordName].x,
                    y2: cluster[toWordName].y,
                    sourceName: word.text,
                    targetName: toWordName
                });
            }
        }

        return  {
            cluster: cluster,
            mst: mst,
            sizeDomain: [minSize, maxSize],
            themes: data.markers.themes,
            words: words,
            wordsForName: wordsForName
        };
    };
    $.extend(this, initData(data));
    this.fontSize.domain(this.sizeDomain);

    // Setup some additional font colour options
    var hot = [];
    var medium = [];
    var mild = [];
    for (var i = 0; i < 100; i += 10) {
        var hc = tib.util.hslToRgb(i/100, 1, .7);
        var mc = tib.util.hslToRgb((i+80)%100/100, .8, .55);
        var mlc = tib.util.hslToRgb((i+60)%100/100, .8, .4);
        hot.push("rgb(" + Math.round(hc[0]) + "," + Math.round(hc[1]) + "," + Math.round(hc[2]) + ")");
        medium.push("rgb(" + Math.round(mc[0]) + "," + Math.round(mc[1]) + "," + Math.round(mc[2]) + ")");
        mild.push("rgb(" + Math.round(mlc[0]) + "," + Math.round(mlc[1]) + "," + Math.round(mlc[2]) + ")");
    }
    tib.uic.COLOURS['Hot'] = hot;
    tib.uic.COLOURS['Medium'] = medium;
    tib.uic.COLOURS['Mild'] = mild;

    /**
     * Cleanup all traces of this visualisation.
     */
    this.destroy = function () {
        this.selector.remove();
        $('#vis-menu .cloud-menu').remove();
        $('#vis-help .cloud-help').remove();
        $('#vis-types li').removeClass('active');
        $('#' + self.drawTarget).css("background-color", '');
    };

    /**
     * Select the layout mode for the cloud.
     *
     * @param value The string value for the layout desired.
     */
    this.selectMode = function (value) {
        self.mode = value;
        self.draw({forceRedraw: true});
    };
    
    /**
     * Draw this visualisation.
     */
    this.draw = function (params) {
        
        var webModeToggled = false;
        if (params && params.webMode != null) {
            this.webMode = params.webMode;
            webModeToggled = true;
        }
        
        if (!this.drawn) {
            $('#' + this.drawTarget).css('width', String(this.width) + 'px');
            this.initMenu();
            this.fisheye = d3.fisheye.circular().radius(FISHEYE_RADIUS).distortion(FISHEYE_DISTORTION);
        }

        // Need to redraw help regardless so the right text is in it
        this.initHelp();

        if (webModeToggled && this.drawn) {
            // Toggle between web and cloud mode
            this.doWebTransform();
        }
        else if (!this.drawn || params.forceRedraw) {
            // Draw
            generate();
            this.selector.on("mousemove", fisheyeTransform);
            this.drawn = true;
        }
        
        if (webModeToggled) {
            this.updateMenu();
        }
    };
    
    /**
     * Select a font for the cloud.
     * @param {String} font The font name of the desired font
     */
    this.selectFont = function (font) {
        if (font != this.font) {
            this.font = font;
            this.draw({forceRedraw: true});    
        }
    };

    this.selectOrientation = function(orientation) {
        self.orientation = ORIENTATIONS[orientation];
        self.draw({forceRedraw: true});
    };
    
    /**
     * Toggle style attribute (bold, italic).
     * @param name The string style desired. Valid options or 'bold' or 'italic'.
     */
    this.toggleStyle = function (name) {
        name = name.toLowerCase();
        if (name == 'bold' || name == 'italic') {
            this[name] = !this[name];
            if (this.webMode) {
                this.selector.selectAll('text')
                    .style("font-style", this.italic ? 'italic' : 'normal')
                    .style("font-weight", this.bold ? 'bold' : 'normal')
            }
            else {
                this.draw({forceRedraw: true});    
            }
        }
    };
    
    /**
     * Toggle concept web visualisation mode.
     */
    this.doWebTransform = function () {
        
        drawSpanningTreeLinks();
            
        this.selector.selectAll('text').transition()
            .duration(750)
            .style("font-size", function(d) { return getFontSizeStr(d.size); })
            .attr("transform", function(d) {
                var coords = getWordCoords(d);
                return "translate(" + coords.x + ", " + coords.y + ")rotate(" + (self.webMode ? 0 : d.rotate) + ")";
            });
    };
    
    // Draw the links for the MST.
    var drawSpanningTreeLinks = function () {
        
        self.selector.selectAll('line').remove();
        
        if (self.webMode === true) {
            
            // Draw links
            self.selector.selectAll('line').data(self.mst).enter()
                .insert("line", ":first-child")
                    .attr("x1", function (d) { return d.x1 + self.width/2})
                    .attr("y1", function (d) { return d.y1 + self.height/2})
                    .attr("x2", function (d) { return d.x2 + self.width/2})
                    .attr("y2", function (d) { return d.y2 + self.height/2})
                    .style("stroke-width", 1)
                    .style("stroke", tib.uic.BG_COLOURS[self.bgStyle][1])
                    .style("fill", "none");
                  
            // Store linked words on the line
            self.selector.selectAll('line').each(function (d) {
                d.source = self.renderedWords[d.sourceName];
                d.target = self.renderedWords[d.targetName];
                if (!d.source || !d.target) {
                    // Remove links with missing nodes
                    d3.select(this).remove();
                }
            });
        }
    };
    
    // Render the words
    var drawWords = function (words) {
        
        self.renderedWords = {};
        $.each(words, function (i, w) {
            self.renderedWords[w.text] = w; 
        });
        
        self.selector.attr("width", self.width)
            .attr("height", self.height)
            .append("g")
                .selectAll("text")
                .data(words)
                .enter().append("text")
                    .style("font-size", function(d) { return d.size + "px"; })
                    .style("font-family", self.font)
                    .style("font-style", self.italic ? 'italic' : 'normal')
                    .style("font-weight", self.bold ? 'bold' : 'normal')
                    .attr("text-anchor", "middle")
                    .attr("transform", function(d) {
                        var coords = getWordCoords(d);
                        return "translate(" + coords.x + ", " + coords.y + "),rotate(" + (self.webMode ? 0 : d.rotate) + ")";
                    })
                    .text(function(d) { return d.text; });
        
                        
        if (self.webMode) {
            self.selector.selectAll('text').style("font-size", function(d) { return getFontSizeStr(d.size); })
            drawSpanningTreeLinks();
        }
        
        updateColours();
    };
    
    // Perform the fisheye transform
    var fisheyeTransform = function () {
        if (self.webMode) {          
            self.fisheye.focus(d3.mouse(this));
            self.selector.selectAll("text").each(function(d) { d.fisheye = self.fisheye(getWordCoords(d));})
                //.style('font-size', function (d) { return getFontSizeStr(d.size * d.fisheye.z);})
                .attr("transform", function(d) {
                    return "translate(" + d.fisheye.x + ", " + d.fisheye.y + ")";
                });
                
            self.selector.selectAll("line")
                .attr("x1", function(d) { return d.source.fisheye.x; })
                .attr("y1", function(d) { return d.source.fisheye.y; })
                .attr("x2", function(d) { return d.target.fisheye.x; })
                .attr("y2", function(d) { return d.target.fisheye.y; });
        }
    };
    
    // Start the D3 drawing process
    var generate = function () {
        
        if (self.selector) {
            self.selector.remove();
        }
        self.selector = d3.select('#' + self.drawTarget).append("svg");
        
        switch (self.scaleType) {
            case 'Automatic':
                self.fontSize.exponent(self.autoScaleExponent);        
                break;
            case 'Exponential':
                self.fontSize.exponent(TEXT_SCALE.EXP_MAX);
                break;
            case 'Linear':
                self.fontSize.exponent(1);
                break;
            case 'Square Root':
                self.fontSize.exponent(0.5);
                break;
        }
        
        // Check if any words are too big to fit on the board and reduce maximum font size accordingly
        self.fontSize.range([TEXT_SCALE.FONT_SIZE_MIN, TEXT_SCALE.FONT_SIZE_MAX]);
        var textRuler = $('<span></span>').css({'font-family' : self.font, 'visibility' : 'hidden'});
        $('body').append(textRuler);
        var resizing = true;
        for (var i = 0; i < self.words.length && resizing; i++) {
            
            // Calculate word size
            var w = self.words[i];
            textRuler.css('font-size', self.fontSize(w.size) + 'px');
            if (self.bold) {
                textRuler.css('font-weight', 'bold');
            }
            if (self.italic) {
                textRuler.css('font-style', 'italic');
            }
            textRuler.text(w.text);
            var realSize =  $(textRuler).width();
            while (realSize > self.width * 0.95 || (self.orientation != ORIENTATIONS['Horizontal'] && realSize > self.height * 0.95)) {
                var range = self.fontSize.range();
                if (range[1] <= TEXT_SCALE.FONT_SIZE_MAX_FLOOR) {
                    // Hit floor, stop resizing now
                    resizing = false;
                    break;
                }
                
                // Adjust font size range & recalculate word size
                range[1] = range[1] - 10;
                self.fontSize.range(range);
                realSize = textRuler.css('font-size', self.fontSize(w.size)).width();
            }
        }
        textRuler.remove();
        
        var rotation = d3.scale.linear().domain([0, self.orientation[0] - 1]).range([self.orientation[1], self.orientation[2]]);
        self.layout = d3.layout.cloud().size([self.width, self.height])
            .words(self.words)
            .rotate(function() { return rotation(~~(Math.random() * self.orientation[0])); })
            .spiral(self.mode.toLowerCase())
            .font(self.font)
            .fontSize(function(d) { return self.fontSize(d.size); })
            .fontStyle(self.italic ? 'italic' : '')
            .fontWeight(self.bold ? 'bold' : 'normal')
            .on("end", drawWords)
            .start();
    };
    
    // Determine colour for the specified word
    var getColourForWord = function (text) {
        return self.themeColours[self.wordsForName[text].themeId];
    };
    
    // Determine font style attribute
    var getFontSizeStr = function (originalSize) {
        return (self.webMode ? 2 + 3 * Math.sqrt(originalSize) : originalSize) + 'px';
    };
    
    // Get x & y coords for word
    var getWordCoords = function (d) {
        var x = self.webMode ? self.cluster[d.text].x : d.x;
        var y = self.webMode ? self.cluster[d.text].y : d.y;
        x = x + self.width/2;
        y = y + self.height/2;    
        return {x: x, y: y};
    };
    
    // Update colours
    var updateColours = function () {

        var colours = tib.uic.COLOURS[self.colourStyle];
        self.themeColours = {};
        var themeCount = 0;
        for (var id in self.themes) {

            // Truncate colourisation of themes by connectivity
            if (themeCount < colours.length) {
                self.themeColours[id] = colours[themeCount];
            }
            else {
                self.themeColours[id] = INACTIVE_THEME_COLOUR;
            }
            themeCount = themeCount + 1;
        }

        self.selector.selectAll('text').style("fill", function(d) { return getColourForWord(d.text); })
    };

    // Update background colour
    var updateBackgroundColour = function () {
        self.selector.style("background-color", tib.uic.BG_COLOURS[self.bgStyle][0]);
        self.selector.selectAll('line').style("stroke", tib.uic.BG_COLOURS[self.bgStyle][1])
        $('#' + self.drawTarget).css("background-color", tib.uic.BG_COLOURS[self.bgStyle][0]);
    };

    /**
     * Initialise the menu for this vis. This method injects the menu into the corrext place.
     */
    this.initMenu = function () {

        // Top level menu
        var menuContainer = $('#vis-menu');

        /* Build the menu - last has to come first to preserve the share button */
        
        // Advanced menu
        $(menuContainer).prepend('<li class="cloud-menu dropdown" id="cloud-menu-advanced"><a class="dropdown-toggle" data-toggle="dropdown" href="#">Advanced<b class="caret"></b></a><ul class="dropdown-menu"></ul></li>');
        var advancedMenu = $('#cloud-menu-advanced ul');
        // Word size
        advancedMenu.append($('<li class="nav-header">Word Scaling</li>'));
        $.each(TEXT_SCALE.OPTIONS, function (i, value) {
            var listEl = $('<li class="scale-type"><a href="#">' + value + '</a></li>');
            // Click handler
            listEl.click(function(e) {
                e.preventDefault();
                self.scaleType = value;
                self.draw({forceRedraw: true});
                $('#cloud-menu-advanced li.scale-type').removeClass('active');
                listEl.addClass('active');
            });

            if (value == self.scaleType) {
                listEl.addClass('active')
            }
            advancedMenu.append(listEl);
        });
        
        // Colour selection
        $(menuContainer).prepend('<li class="cloud-menu dropdown" id="cloud-menu-colours"><a class="dropdown-toggle" data-toggle="dropdown" href="#">Colours<b class="caret"></b></a><ul class="dropdown-menu"></ul></li>');
        var coloursMenu = $('#cloud-menu-colours ul');
        // Background colouring
        coloursMenu.append($('<li class="nav-header">Background Colours</li>'));
        $.each(tib.uic.BG_COLOURS, function (key, value) {
            var listEl = $('<li class="bg-colour"><a href="#">' + key + '</a></li>');
            // Click handler
            listEl.click(function(e) {
                e.preventDefault();
                self.bgStyle = key;
                updateBackgroundColour();
                $('#cloud-menu-colours li.bg-colour').removeClass('active');
                listEl.addClass('active');
            });

            if (key == self.bgStyle) {
                listEl.addClass('active')
            }
            coloursMenu.append(listEl);
        });
        // Theme colouring
        coloursMenu.append($('<li class="nav-header">Theme Colours</li>'));
        $.each(tib.uic.COLOURS, function (key, value) {
            // Build colour icons
            var colours = '';
            var ellipsis = false ;
            $.each(value, function (index, val) {
                if (index === 10) {
                    ellipsis = true;
                    return false;
                }
                colours += '<i class="icon-sign-blank" style="color: ' + val + ';"></i>';
            });
            var listEl = $('<li class="colour"><a href="#">' + colours + (ellipsis ? '...' : '') + '</a></li>');
            // Click handler
            listEl.click(function(e) {
                e.preventDefault();
                self.colourStyle = key;
                updateColours();
                $('#cloud-menu-colours li.colour').removeClass('active');
                listEl.addClass('active');
            });

            if (key == self.colourStyle) {
                listEl.addClass('active')
            }
            coloursMenu.append(listEl);
        });

        // Layout selection
        $(menuContainer).prepend('<li class="cloud-menu dropdown" id="cloud-menu-layout"><a class="dropdown-toggle" data-toggle="dropdown" href="#">Layout<b class="caret"></b></a><ul class="dropdown-menu" id="cloud-menu-layout"></ul></li>');
        var layoutMenu = $('#cloud-menu-layout ul');
        // Mode options
        layoutMenu.append($('<li class="nav-header">Cloud Shape</li>'));
        $(['Archimedean', 'Rectangular']).each(function (i, mode) {
            var listEl = $('<li class="mode"><a href="#">' + mode.replace('Archimedean', 'Circular') + '</a></li>');
            // Click handler
            listEl.click(function(e) {
                e.preventDefault();
                self.selectMode(mode);
                $('ul#cloud-menu-layout li.mode').removeClass('active');
                listEl.addClass('active');
            });
            if (mode == self.mode) {
                listEl.addClass('active')
            }
            layoutMenu.append(listEl);
        });
        // Orientation options
        layoutMenu.append($('<li class="nav-header">Word Placement</li>'));
        $.each(ORIENTATIONS, function (key, value) {
            var listEl = $('<li class="orientation"><a href="#">' + key + '</a></li>');
            // Click handler
            listEl.click(function(e) {
                e.preventDefault();
                self.selectOrientation(key);
                $('ul#cloud-menu-layout li.orientation').removeClass('active');
                listEl.addClass('active');
            });

            if (value == self.orientation) {
                listEl.addClass('active')
            }
            layoutMenu.append(listEl);
        });

        // Font selection
        $(menuContainer).prepend('<li class="cloud-menu dropdown"><a class="dropdown-toggle" data-toggle="dropdown" href="#">Font<b class="caret"></b></a><ul class="dropdown-menu" id="cloud-menu-text"></ul></li>');
        var fontMenu = $('ul#cloud-menu-text');
        // Style options
        fontMenu.append($('<li class="nav-header">Style</li>'));
        var boldEl = $('<li class="style"><a href="#" style="font-weight:bold">Bold</a></li>').appendTo(fontMenu)
            // Click handler
            .click(function(e) {
                e.preventDefault();
                // This is set to the event target
                $(this).toggleClass('active');
                self.toggleStyle('bold');
            });
        boldEl.toggleClass('active', self.bold);
        var italicEl = $('<li class="style"><a href="#" style="font-weight:bold">Italic</a></li>').appendTo(fontMenu)
            // Click handler
            .click(function(e) {
                e.preventDefault();
                $(this).toggleClass('active');
                self.toggleStyle('italic');
            });
        italicEl.toggleClass('active', self.italic);
        // Font Family options
        fontMenu.append('<li class="nav-header">Font</li>');
        $(tib.uic.FONTS).each(function (i, font) {
            var listEl = $('<li class="font"><a href="#" style="font-family:' + font + '">' + font + '</a></li>');
            // Click handler
            listEl.click(function(e) {
                e.preventDefault();
                self.selectFont(font);
                $('ul#cloud-menu-text li.font').removeClass('active');
                listEl.addClass('active');
            });
            // Make sure the current font is set as active.
            if (font == self.font) {
                listEl.addClass('active');
            }
            fontMenu.append(listEl);
        });

        // Refresh button
        $('<li class="cloud-menu" id="cloud-menu-refresh"><a href="#">Refresh</a></li>').prependTo(menuContainer)
            .click(function(e) {
                e.preventDefault();
                self.draw({forceRedraw: true});
            });
    };

    // Create the body content for the help modal.
    this.initHelp = function () {
        // Clear it out
        $('#vis-help .modal-body').empty();

        // Place to inject
        var visContainer = $('#vis-help .modal-body');
        var modal = '';
        if (self.webMode === true) {
            modal +=
                '<h3>Concept Web</h3>'+
                '<p>This is where you really see the power of the text analytics provided by <a href="http://leximancer.com" target="_blank">Leximancer</a>.</p>'+
                '<p>In this visualisation, the position of concepts matter. Concepts that are more realted will appear near each other. Concepts that aren\'t very related will appear futher apart.</p>'+
                '<p>As with the Concept Cloud, related concepts are grouped into <em>themes</em>. Themes are denoted by colour.</p>' +
                '<p>There is one cavaet with theme colouring you should be aware of. The number of themes identified by Leximancer depends on the number of concepts found which in turn depends on your text. The available colour schemse define between 8 and 10 colours. If there are are more themes then there is colours in your selected scheme, the remaining themes will be coloured grey. This can cause confusion with colour schemes them themselves contain grey.</p>';

        }
        else {
            modal +=
                '<h3>Concept Cloud</h3>'+
                '<p>This visualisation is inspired by Wordle but it has a little <a href="http://leximancer.com" target="_blank">Leximancer</a> magic sprinkled on top.</p>'+
                '<p>In this visualisation, the concepts are positioned randomly to keep the visualisation nice and compact. The size of a concept dentones how frequent it is within the text.</p>'+
                '<p>Unlike Wordle, the Concept Cloud groups concepts into <em>themes</em>. Themes are denoted by colour. Concepts that have the same colour belong to the same theme and are cloesly related. You can select the colours you want to use under the colour menu. Some colours work better with the Concept Cloud, others work better with the Concept Web.</p>' +
                '<p>There is one cavaet with theme colouring you should be aware of. The number of themes identified by Leximancer depends on the number of concepts found which in turn depends on your text. The available colour schemse define between 8 and 10 colours. If there are are more themes then there is colours in your selected scheme, the remaining themes will be coloured grey. This can cause confusion with colour schemes them themselves contain grey.</p>';
        }
        visContainer.append(modal);
    };

    // Update the menus based on web or cloud mode
    this.updateMenu = function () {
        $('#vis-types li').removeClass('active');
        if (this.webMode === true) {
            $('#cloud-menu-layout').hide();
            $('#cloud-menu-refresh').hide();
            $('#vis-types li.web').addClass('active');
            
        }
        else {
            $('#cloud-menu-layout').show();
            $('#cloud-menu-refresh').show();
            $('#vis-types li.cloud').addClass('active');
        }
    };

    return this;
};