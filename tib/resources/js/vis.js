/**
 * Entry point for visualisations.
 */
var tib = {vis:{}};

/**
 * Singleton for managing visualisations.
 */
tib.vis.Manager = function () {
    
    // Default component IDs
    var drawTarget = "vis-canvas";
    var target = "vis-container";
    
    // Current visualisation
    var currentVis = null;
        currentVisType = null;
    
    // JSON data
    var data = null;
    
    // Register of known visualisations
    var visConfigs = {};
    
    return {
        
        /**
         * Clear current visualisation.
         */
        clear: function () {
            if (currentVis) {
                currentVis.destroy();
                currentVis = currentVisType = null;
            }
        },
        
        /**
         * Draw a visualisation.
         * @param {String} type
         */
        draw: function(type, params) {
            
            if (currentVisType != type) {
                
                this.clear();
                
                // Instantiate the new visualisation and set as current
                var ref = tib.vis[type];
                currentVis = new ref(visConfigs[type], data);
                currentVisType = type;
            }

            currentVis.draw(params);
        },
        
        /**
         * Register visualisation.
         * @param {String} type
         * @param {Object} config
         */
        registerVis: function(type, config) {
            $.extend(config, {
                drawTarget: drawTarget,
                target: target
            });
            visConfigs[type] = config;
        },
        
        /**
         * Set JSON data for all visualisations.
         * @param {Object} aData
         */
        setData: function (aData) {
            data = aData;
        },
        
        /**
         * Share the current visualisation.
         * @param {String} exportType
         */
        shareVis: function (exportType) {
            switch (exportType.toUpperCase()) {
                case 'PNG':
                    window.open(currentVis.asPNG());
                    break;
                case 'SVG':
                    tib.util.downloadSVG(drawTarget);
                    break;
                case 'TWT':
                    tib.util.tweet(currentVis.asPNG())
            }
        }
    }
}();