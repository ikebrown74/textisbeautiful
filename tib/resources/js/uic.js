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
    },
    sequential: {
        // Colorbrew colours used here
        'Purple': d3.scale.ordinal().range(["rgb(239,237,245)","rgb(218,218,235)","rgb(188,189,220)","rgb(158,154,200)","rgb(128,125,186)","rgb(106,81,163)","rgb(74,20,134)"]),
        'Blue': d3.scale.ordinal().range(["rgb(222,235,247)","rgb(198,219,239)","rgb(158,202,225)","rgb(107,174,214)","rgb(66,146,198)","rgb(33,113,181)","rgb(8,69,148)"]),
        'Green': d3.scale.ordinal().range(["rgb(229,245,224)","rgb(199,233,192)","rgb(161,217,155)","rgb(116,196,118)","rgb(65,171,93)","rgb(35,139,69)","rgb(0,90,50)"]),
        'Red': d3.scale.ordinal().range(["rgb(254,224,210)","rgb(252,187,161)","rgb(252,146,114)","rgb(251,106,74)","rgb(239,59,44)","rgb(203,24,29)","rgb(153,0,13)"]),
        'Grey': d3.scale.ordinal().range(["rgb(240,240,240)","rgb(217,217,217)","rgb(189,189,189)","rgb(150,150,150)","rgb(115,115,115)","rgb(82,82,82)","rgb(37,37,37)"])
    },
    divergent: {
        // Colorbrew colours used here
        'RedYellowGreen': d3.scale.ordinal().range(["rgb(215,48,39)","rgb(244,109,67)","rgb(253,174,97)","rgb(254,224,139)","rgb(217,239,139)","rgb(166,217,106)","rgb(102,189,99)","rgb(26,152,80)"]),
        'PinkYellow': d3.scale.ordinal().range(["rgb(197,27,125)","rgb(222,119,174)","rgb(241,182,218)","rgb(253,224,239)","rgb(230,245,208)","rgb(184,225,134)","rgb(127,188,65)","rgb(77,146,33)"]),
        'PinkGreen': d3.scale.ordinal().range(["rgb(140,81,10)","rgb(191,129,45)","rgb(223,194,125)","rgb(246,232,195)","rgb(199,234,229)","rgb(128,205,193)","rgb(53,151,143)","rgb(1,102,94)"]),
        'Spectral': d3.scale.ordinal().range(["rgb(213,62,79)","rgb(244,109,67)","rgb(253,174,97)","rgb(254,224,139)","rgb(230,245,152)","rgb(171,221,164)","rgb(102,194,165)","rgb(50,136,189)"]),
        'RedBlue': d3.scale.ordinal().range(["rgb(178,24,43)","rgb(214,96,77)","rgb(244,165,130)","rgb(253,219,199)","rgb(209,229,240)","rgb(146,197,222)","rgb(67,147,195)","rgb(33,102,172)"]),
        'PurpleGrey': d3.scale.ordinal().range(["rgb(118,42,131)","rgb(153,112,171)","rgb(194,165,207)","rgb(231,212,232)","rgb(224,224,224)","rgb(186,186,186)","rgb(135,135,135)","rgb(77,77,77)"]),
        'RedGrey': d3.scale.ordinal().range(["rgb(178,24,43)","rgb(214,96,77)","rgb(244,165,130)","rgb(253,219,199)","rgb(224,224,224)","rgb(186,186,186)","rgb(135,135,135)","rgb(77,77,77)"])
    }
};

tib.uic.FONTS = ['ABeeZee', 'Arial', 'Audiowide', 'Average Sans', 'Butcherman', 'Cantora One', 'Georgia', 'Impact', 'Kite One',
                'Montserrat', 'Montserrat Alternates', 'Paprika', 'Revalia', 'Sanchez', 'Share Tech Mono', 'Trebuchet MS'];