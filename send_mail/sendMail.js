var config = require('../test/config.js')
var nodemailer = require('nodemailer');
var nodemailerMailgun = require('nodemailer-mailgun-transport');
// var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});

var transporter = nodemailer.createTransport(nodemailerMailgun({
    auth: {
        api_key: config.mailgun.api_key,
        domain: config.mailgun.domain,
    },
}));
 
module.exports = (mail) => {
    transporter.sendMail(mail, (err) => {
        if (err) throw err;
        console.log("Sending mail")
    });

    // mailgun.messages().send(data, function (error, body) {
    //     if (error) throw error;
    //     console.log("Email body:")
    //     console.log(body);
    // });
};