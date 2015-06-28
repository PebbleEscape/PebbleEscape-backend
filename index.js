var express = require('express');
var bodyParser = require('body-parser');
var twilio = require('twilio');

// Construct the app based on the passed-in configuration parameters.
module.exports = function appctor(cfg) {

  var twiclient = twilio(cfg.twilio.accountSid, cfg.twilio.authToken);

  // Create the app
  var app = express();

  app.set('trust proxy', true);

  // Parse incoming request bodies
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  // Use the Connect favicon.
  app.use(express.static(__dirname + '/static'));

  function playResponse(req, res) {
    // Create our TwiML response.
    var resTwiml = new twilio.TwimlResponse();

    // Play any defined sound, or just hang up if undefined
    if (req.query.play) {
      resTwiml.play(req.query.play);
    } else {
      resTwiml.hangup();
    }

    // Send the response we've built to Twilio
    return res.type('text/xml').send(resTwiml.toString());
  }

  function callNumber(req, res, next) {
    if (!req.body.to) {
      next('No number specified');
    }

    var responseUrl = req.protocol + '://' + req.header('host') + '/response';

    if (req.body.play) {
      responseUrl += '?play=' + encodeURIComponent(req.body.play);
    }

    return twiclient.makeCall({
      to: req.body.to,
      from: cfg.twilio.number,
      url: responseUrl
    }).then(function (result) {
      res.send({status: 'ok'});
    }).catch(function (err) {
      console.log(err);
      return next(err);
    });
  }

  function smsNumber(req, res, next) {
    if (!req.body.to) {
      next('No numbers specified');
    }

    if (!Array.isArray(req.body.to)){
      req.body.to = [req.body.to];
    }

    return Promise.all(req.body.to.map(function (number) {
      return twiclient.sms.messages.post({
        to: number,
        from: cfg.twilio.number,
        body: req.body.body
      });
    })).then(function (result) {
      res.send({status: 'ok'});
    }).catch(function (err) {
      console.log(err);
      return next(err);
    });
  }

  // The route for recieving a call from Twilio.
  app.get('/response', playResponse);
  app.post('/response', playResponse);

  app.post('/call', callNumber);
  app.post('/sms', smsNumber);

  // Respond with a 404 code for any other requests
  app.use(function(req,res){return res.status(404).send()});

  return app;
};
