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
 * Share an image of this visualisation using a link to the image on Google+. Uploads the image to imgur.
 *
 * @param {String} imageData Base64 encode image data
 */
tib.util.googlePlus = function (imageData) {
    tib.util.social(imageData, function(pic, imgur) {
        window.open(
            'https://plus.google.com/share?url=' + encodeURI(imgur),
            '_blank',
            'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600'
        );
    });
};

/**
 * Share an image of this visualisation using a link to the image on Facebook. Uploads the image to imgur.
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

/*
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
tib.util.rgbToHsl = function rgbToHsl(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
};

/*
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
tib.util.hslToRgb = function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r * 255, g * 255, b * 255];
};

/*
 * Converts an RGB color value to HSV. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and v in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSV representation
 */
tib.util.rgbToHsv = function rgbToHsv(r, g, b){
    r = r/255, g = g/255, b = b/255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, v = max;

    var d = max - min;
    s = max == 0 ? 0 : d / max;

    if(max == min){
        h = 0; // achromatic
    }else{
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, v];
};

/*
 * Converts an HSV color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSV_color_space.
 * Assumes h, s, and v are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  v       The value
 * @return  Array           The RGB representation
 */
tib.util.hsvToRgb = function hsvToRgb(h, s, v){
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch(i % 6){
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [r * 255, g * 255, b * 255];
};