/**
 * Entry point for visualisations.
 */
var tib = {vis:{}};

/**
 * Register of visualisations
 */
tib.vis.visualisations = {};

/**
 *
 * @param name
 * @param vis
 */
tib.vis.registerVis = function(name, vis) {
    tib.vis.visualisations[name] = vis;
};

/**
 *
 * @param name
 */
tib.vis.activate = function(name) {
    tib.vis.activeVis = tib.vis.visualisations[name];
    tib.vis.activeVis.activate();
};