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

/**
 * Post an image of this visualisation to social media
 *
 * @param {String} imageData Base64 encode image data
 * @param {Function} beSocial The code to complete the social interaction. Called in the success handler of the ajax request and passed the actual image url followed by the imgur url.
 */
tib.util.social = function (imageData, beSocial) {
    $("#alert-share-success, #alert-share-error").hide();
    $("#alert-share-load").fadeIn('fast');
    $.ajax({
        url: "http://api.imgur.com/2/upload.json",
        type: "POST",
        data: {
            key: tib.util.imgurApiKey,
            image: imageData.substring(22)
        },
        success: function(data) {
            $("#alert-share-load").hide();
            $("#alert-share-success").fadeIn('fast');
            beSocial(data.upload.links.original, data.upload.links.imgur_page);
        },
        error: function() {
            $("#alert-share-load").hide();
            $("#alert-share-error").fadeIn('fast');
        }
    });
};

/**
 * Tweet an image of this visualisation using a link to the image. Uploads the image to imgur.
 *
 * @param {String} imageData Base64 encode image data
 */
tib.util.tweet = function (imageData) {
    tib.util.social(imageData, function(pic, imgur) {
        window.open(
            'https://twitter.com/intent/tweet?url=' + encodeURI(imgur) + '&text=' + encodeURI('Check out the visualisation I just created!' + '&hashtags=textisbeautiful'),
            '_blank',
            'scrollbars=yes,resizable=yes,toolbar=no,location=yes,width=550,height=420'
        );
    });
};

/**
 * Send a Facebook post containing the image of this visualisation using a link to the image. Uploads the image to imgur.
 *
 * @param {String} imageData Base64 encode image data
 */
tib.util.facebook = function (imageData) {
    tib.util.social(imageData, function(pic, imgur) {
        var publish = {
            method: 'stream.publish',
            display: 'popup',
            name: 'TextIsBeautiful.net Visualisation',
            description: 'Checkout the visualisation image I created using textisbeautiful.net!',
            picture: pic,
            link: imgur,
            // Dirty hack for shitty Facebook. Twitter is so much easier.
            redirect_uri: 'http://textisbeautiful.net/fb_close/'
        };
        FB.ui(publish);
    });
};