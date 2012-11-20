/**
 * UI Components.
 */
tib.uic = {};

tib.uic.FONTS = ['ABeeZee', 'Arial', 'Audiowide', 'Average Sans', 'Butcherman', 'Cantora One', 'Georgia', 'Impact', 'Kite One', 
                'Montserrat', 'Montserrat Alternates', 'Paprika', 'Revalia', 'Sanchez', 'Share Tech Mono', 'Trebuchet MS'];

/**
 * Initialise menu components.
 */
tib.uic.initMenu = function () {
    
    // Text selection
    var textUI = $('ul#text');
    // Style
    textUI.append($('<li class="nav-header">Style</li>'));
    textUI.append(
        $('<li class="style"><a href="#" onclick="tib.vis.toggleStyle(this, \'bold\');" style="font-weight:bold">Bold</a></li>'),
        $('<li class="style"><a href="#" onclick="tib.vis.toggleStyle(this, \'italic\');" style="font-style:italic">Italic</a></li>')
    );
    // Font
    textUI.append($('<li class="nav-header">Font</li>'));
    $(tib.uic.FONTS).each(function (i, font) {
        var listEl = $('<li class="font"><a href="#" onclick="tib.vis.selectFont(this);" style="font-family:' + font + '">' + font + '</a></li>');
        if (font == tib.cloud.DEFAULTS.font) {
            listEl.addClass('active')
        }
        textUI.append(listEl);
    });
    
    // Layout selection
    var layoutUI = $('ul#layout');
    // Mode
    layoutUI.append($('<li class="nav-header">Cloud Shape</li>'));
    $(['Archimedean', 'Rectangular']).each(function (i, mode) {
        var listEl = $('<li class="mode"><a href="#" onclick="tib.vis.selectMode(this,\'' + mode + '\');">' + mode.replace('Archimedean', 'Circular') + '</a></li>');
        if (mode == tib.cloud.DEFAULTS.mode) {
            listEl.addClass('active')
        }
        layoutUI.append(listEl); 
    });
    // Orientation
    layoutUI.append($('<li class="nav-header">Word Orientation</li>'));
    $.each(tib.cloud.ORIENTATIONS, function (key, value) {
        var listEl = $('<li class="orientation"><a href="#" onclick="tib.vis.selectOrientation(this);">' + key + '</a></li>');
        if (value == tib.cloud.DEFAULTS.orientation) {
            listEl.addClass('active')
        }
        layoutUI.append(listEl);
    });
    
    $('#vis-menu').show();
};