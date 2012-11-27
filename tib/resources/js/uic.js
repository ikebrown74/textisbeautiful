/**
 * UI Components.
 */
tib.uic = {};

tib.uic.COLOURS = {
    categorical: {
        'Basic': ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"],
        'Hard' : ["#E41A1C", "#377EB8", "#4DAF4A", "#984EA3", "#FF7F00", "#5A5A0A", "#A65628", "#F781BF"]
    },
    random: {
        'Set 1': d3.scale.category20(),
        'Set 2': d3.scale.category20b(),
        'Set 3': d3.scale.category20c()
    }
};

tib.uic.FONTS = ['ABeeZee', 'Arial', 'Audiowide', 'Average Sans', 'Butcherman', 'Cantora One', 'Georgia', 'Impact', 'Kite One',
                'Montserrat', 'Montserrat Alternates', 'Paprika', 'Revalia', 'Sanchez', 'Share Tech Mono', 'Trebuchet MS'];