var express = require('express');
var twilio = require('twilio');

// Construct the app based on the passed-in configuration parameters.
module.exports = function appctor(cfg) {

  var twiclient = twilio(cfg.twilio.accountSid, cfg.twilio.authToken);

  // Create the app
  var app = express();

  // Parse incoming request bodies
  app.use(express.bodyParser());

  // Use the Connect favicon.
  app.use(express.static(__dirname + '/static'));

  function playResponse(req, res) {
    // Create our TwiML response.
    var resTwiml = new twilio.TwimlResponse();

    resTwiml.play('/halp.ogg');

    // Send the response we've built to Twilio
    return res.type('text/xml').send(resTwiml.toString());
  }

  function callNumber(req, res, next) {
    if (!req.body.to) {
      next('No number specified');
    }
    return twiclient.makeCall({
      to: req.body.to,
      //from: '+14505556677',
      url: '/response'
    }).then(function(result){
      res.send('OK');
    }).catch(function(err){
      return next(err);
    });
  }

  // The route for recieving a call from Twilio.
  app.get('/response',playResponse);
  app.post('/response',playResponse);

  app.post('/call',callNumber);

  // Respond with a 404 code for any other requests
  app.use(function(req,res){return res.status(404).send()});

  return app;
};
