// Run this to receive a png image stream from your drone.

var arDrone = require('ar-drone');
var cv = require('opencv');
var http = require('http');
var fs = require('fs');

console.log('Connecting png stream ...');

//var stream  = arDrone.createUdpNavdataStream();
var client = arDrone.createClient();
var pngStream = client.getPngStream();
var processingImage = false;
var flying = false;
var rawPng;
var processedPng;
var navData;
var startTime = new Date().getTime();

// variables from test.js
var lowThresh = 0;
var highThresh = 100;
var nIters = 2;
var minArea = 200;
var maxArea = 100000;

// constants
var RAW_HEIGHT = 360;
var RAW_WIDTH = 640;
var THRESH_MIN = [50, 10, 190]; //B, G, R
var THRESH_MAX = [160, 150, 255]; //B, G, R

pngStream
  .on('error', console.log)
  .on('data', function(pngBuffer) {
    // console.log("got image");
    rawPng = pngBuffer;
  });

var scanImage = function() {
  if( flying && !processingImage && rawPng ) {
    processingImage = true;
    cv.readImage( rawPng, function(err, im) {
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

      if (maxIndex === -1) {
        console.log("No blob found AAAAAAH...");
        //processingImage = false;
        return;
      }

      var rect = contours.boundingRect(maxIndex);

      var dest = [rect.x + rect.width/2, rect.y + rect.height/2];
      moveTowards(dest);

      //processingImage = false;
    });
  }
};

var moveTowards = function(dest) {
  deltaX = dest[0] - RAW_WIDTH/2;
  deltaY = dest[1] - RAW_HEIGHT/2;
  console.log("deltaX = " + deltaX + "  deltaY = " + deltaY);
}

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
  if (!rawPng) {
    res.writeHead(503);
    res.end('Did not receive any png data yet.');
    return;
  }

  res.writeHead(200, {'Content-Type': 'image/png'});
  res.end(rawPng);
});

server.listen(8080, function() {
  console.log('Serving latest png on port 8080 ...');
});

