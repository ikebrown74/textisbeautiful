/**
 * Entry point for visualisations.
 */
var tib = {vis:{}};



/**
 * Initialise the visualisation with JSON data.
 */
tib.vis.init = function (data) {
    tib.vis.activeVis = new tib.vis.ConceptCloud(data);
    tib.vis.activeVis.draw();
};

/**
 * Select visualisation font.
 */
tib.vis.selectFont = function (f) {
    $('ul#cloud-menu-text li.font').removeClass('active');
    var fontEl = $(f);
    fontEl.parent().addClass('active');
    var font = fontEl.text();
    tib.vis.activeVis.selectFont(font);
};

/**
 * Select visualisation placement mode.
 */
tib.vis.selectMode = function (m, value) {
    $('ul#cloud-menu-layout li.mode').removeClass('active');
    var modeEl = $(m);
    modeEl.parent().addClass('active');
    tib.vis.activeVis.mode = value;
    tib.vis.activeVis.draw();
};

/**
 * Select visualisation orientation.
 */
tib.vis.selectOrientation = function (o) {
    $('ul#cloud-menu-layout li.orientation').removeClass('active');
    var orientEl = $(o);
    orientEl.parent().addClass('active');
    var orientation = orientEl.text();
    tib.vis.activeVis.orientation = tib.vis.cloud.ORIENTATIONS[orientation];
    tib.vis.activeVis.draw();
};

/**
 * Toggle style attribute (bold, italic)
 */
tib.vis.toggleStyle = function (el, name) {
    el = $(el);
    el.parent().toggleClass('active');
    tib.vis.activeVis.toggleStyle(name);
};

/**
 * Toggle web view mode.
 */
tib.vis.toggleWebView = function (enabled) {
    if (tib.vis.activeVis.webMode != enabled) {
        $('#vis-types li').removeClass('active');
        $('#vis-types li.' + (enabled ? 'web' : 'cloud')).addClass('active');
        tib.vis.activeVis.webMode = enabled;
        tib.vis.activeVis.toggleWeb();
    }
};