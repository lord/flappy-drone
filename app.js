// Run this to receive a png image stream from your drone.

var arDrone = require('ar-drone');
var cv = require('opencv');
var http    = require('http');
var fs = require('fs');

console.log('Connecting png stream ...');

//var stream  = arDrone.createUdpNavdataStream();
var client = arDrone.createClient();
var pngStream = client.getPngStream();
var processingImage = false;
var flying = false;
var lastPng;
var navData;
var startTime = new Date().getTime();

pngStream
  .on('error', console.log)
  .on('data', function(pngBuffer) {
    // console.log("got image");
    lastPng = pngBuffer;
  });

var scanImage = function() {
  if( flying && !processingImage && lastPng ) {
    processingImage = true;
    cv.readImage( lastPng, function(err, im) {
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
};

var scanInterval = setInterval( scanImage, 150);

// configure client
client.on('navdata', function(navdata) {
  navData = navdata;
});

client.after(5000, function() {
  flying = true;
});

client.config('video:video_channel', 3); // set to use down camera

client.takeoff();

var server = http.createServer(function(req, res) {
  if (!lastPng) {
    res.writeHead(503);
    res.end('Did not receive any png data yet.');
    return;
  }

  res.writeHead(200, {'Content-Type': 'image/png'});
  res.end(lastPng);
});

server.listen(8080, function() {
  console.log('Serving latest png on port 8080 ...');
});

