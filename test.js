var cv = require('opencv');
var repl = require('repl');

var lowThresh = 0;
var highThresh = 100;
var nIters = 2;
var minArea = 200;
var maxArea = 100000;
var numTests = 6;

var BLUE = [0, 255, 0]; //B, G, R
var RED   = [0, 0, 255]; //B, G, R
var GREEN = [0, 255, 0]; //B, G, R
var WHITE = [255, 255, 255]; //B, G, R

var THRESH_MIN = [50, 10, 190]; //B, G, R
var THRESH_MAX = [160, 150, 255]; //B, G, R

for (img = 1; img < numTests; img++) {
  cv.readImage('test/' + img.toString() + '.png', function(err, im) {
    var markedOut = im.copy();
    im.convertHSVscale();
    im.inRange(THRESH_MIN, THRESH_MAX);

    var out = im.copy();

    var im_canny = im.copy();

    im_canny.canny(lowThresh, highThresh);
    im_canny.dilate(nIters);

    var contours = im_canny.findContours();

    var maxFound = 0;
    var maxIndex = -1;

    for(i = 0; i < contours.size(); i++) {

      console.log(contours.area(i));
      var area = contours.area(i);
      if(area < minArea || area > maxArea) continue;

      if(area > maxFound) {
        maxFound = area;
        maxIndex = i;
      }
    }

    var rect = contours.boundingRect(maxIndex);

    markedOut.line([rect.x, rect.y], [rect.x + rect.width/2, rect.y + rect.height/2], [0, 0, 255]);
    // repl.start("Greetings flapmaster!  ");

    markedOut.save('test/out' + img.toString() + '.png');
  });

}
