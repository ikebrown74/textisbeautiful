/**
 * Utility functions.
 */
tib.util = {};

/**
 * Export the visualisation as SVG.
 */
tib.util.downloadSVG = function (target) {
    var svgContent = $('div#'+ target + ' svg').attr("version", "1.1").attr("xmlns", "http://www.w3.org/2000/svg").parent().get(0).innerHTML
    window.open("data:image/svg+xml;charset=utf-8;base64," + btoa(unescape(encodeURIComponent(svgContent))));
};