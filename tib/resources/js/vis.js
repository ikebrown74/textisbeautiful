/**
 * Entry point for visualisations.
 */
var tib = {vis:{}};

/**
 * Register of visualisations
 */
tib.vis.visualisations = {};

/**
 * Register a visualisation with the manager
 * @param {String} name The name to register this vis with.
 * @param {Object} vis The visualisation itself.
 */
tib.vis.registerVis = function(name, vis) {
    tib.vis.visualisations[name] = vis;
};

/**
 * Activate a visualisation by name. Will destroy the current active vis.
 * @param {String} name The name of the vis.
 * @param {DOMElement} el OPTIONAL The dom source of this call.
 */
tib.vis.activate = function(name, el) {
    if (tib.vis.activeVis !== undefined) {
        // Dirty hack to accommodate or special 2 vis in 1 cloud
        if (!(name === 'cloud' && tib.vis.visualisations['cloud'] === tib.vis.activeVis)) {
            tib.vis.activeVis.destroy();
        }
    }
    // Toggle the active class if this was called from a DOMElement
    if (el !== undefined) {
        $('#vis-types li').removeClass('active');
        $(el).parent().addClass('active');
    }
    tib.vis.activeVis = tib.vis.visualisations[name];
    tib.vis.activeVis.activate();
};