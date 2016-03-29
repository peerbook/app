
var flexPoly = (function () {
    
    var createStyleNode = function () {
        var style = document.createElement("style");
	style.appendChild(document.createTextNode(""));
	document.head.appendChild(style);
	return style;
    };
    
    var addCss = function (css) {
        createStyleNode().innerHTML = css;
    };
    
    var supportFlexBox = function () {
        return document.body.style.flex !== undefined;
    };
        
    var oldFlex = function () {
      
        return "\
[layout='row'] {\n\
display: -moz-box; \n\
display: -webkit-box; \n\
display: box;\n\
}\n\
[layout='row']:after {\n\
clear:both;\n\
content: ' ';\n\
height: 1px;\n\
visibility: hidden;\n\
}\n\
\n\
 \n\
[layout='row'] > [flex] { \n\
 -moz-box-flex: 1; \n\
-webkit-box-flex: 1; \n\
box-flex: 1;\n\ \n\
} \n\
\n\
[layout-wrap] > * {\n\
  float: left;\n\
}\n\
\n\
";
        
    };
    
    var applyRules = function () {
        
        var width = document.body.scrollWidth - 100;
        
        var flexes = ['50', '25', '33', '10'];
        var css = "";
        flexes.forEach(function (flex) {
            var w = width / (100 / flex);
            css += "[wrap='"+flex+"'] { width: "+w+"px; } ";
        });
        
        addCss(css);
    };  
        
    
    return {
        init : function () {            
            if(!supportFlexBox()) {
                console.info("Add support old flexbox for angular material");
                addCss(oldFlex());
                
                
                
                applyRules();
            }
        }
    };
    
})();

window.addEventListener('load', function () {
    flexPoly.init();
}, false);


