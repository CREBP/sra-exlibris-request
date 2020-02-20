var nodemailer = require('nodemailer');
var nodemailerMailgun = require('nodemailer-mailgun-transport');
// var mailgun = require('mailgun-js')({apiKey: api_key, domain: domain});
 
module.exports = async (mailgunapi, mail) => {
    return new Promise((resolve, reject) => {
        var transporter = nodemailer.createTransport(nodemailerMailgun({
            auth: {
                api_key: mailgunapi.api_key,
                domain: mailgunapi.domain,
            },
        }));
    
        transporter.sendMail(mail, (err) => {
            if (err) {
                resolve(false);
                throw err;
            } else {
                console.log("Sending mail");
                resolve(true);
            }
        });
    })
};