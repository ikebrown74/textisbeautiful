/**
 * Utility functions.
 */
tib.util = {};

// Self explanatory.
tib.util.imgurApiKey = "db94d28f5f22b16a404ca6c12a41d244";

/**
 * Opens a new window with only the SVG image located at 'div#target svg'.
 *
 * @param {String} target ID of the div that is the parent of the SVG element
 */
tib.util.downloadSVG = function (target) {
    var svgContent = $('div#'+ target + ' svg').attr("version", "1.1").attr("xmlns", "http://www.w3.org/2000/svg").parent().get(0).innerHTML
    window.open("data:image/svg+xml;charset=utf-8;base64," + btoa(unescape(encodeURIComponent(svgContent))));
};

tib.util.tweet = function (imageData) {
    $("#alert-share-load").fadeIn('fast');
    $.ajax({
        url: "http://api.imgur.com/2/upload.json",
        type: "POST",
        data: {
            key: tib.util.imgurApiKey,
            image: imageData.substring(22)
        },
        success: function(data) {
            $("#alert-share-load").alert('close');
            $("#alert-share-success").fadeIn('fast');
            window.open(
                'https://twitter.com/intent/tweet?url=' + encodeURI(data.upload.links.imgur_page) + '&text=' + encodeURI('Check out the visualisation I just created!' + '&hashtags=textisbeautiful'),
                '_blank',
                'scrollbars=yes,resizable=yes,toolbar=no,location=yes,width=550,height=420'
            );
        },
        error: function() {
            $("#alert-share-load").alert('close');
            $("#alert-share-error").fadeIn('fast');
        }
    });
}

