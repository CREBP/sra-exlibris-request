// Helper to generate list
// Handlebars.registerHelper('list', function(items, options) {
//     var out = "<ul>";

//     for(var i=0, l=items.length; i<l; i++) {
//         out = out + "<li>" + options.fn(items[i]) + "</li>";
//     }

//     return out + "</ul>";
// });

var fs = require('fs'),
    path = require('path'),
    Handlebars = require('handlebars'),
    sendMail = require('./sendMail.js');

// Open template file
var source = fs.readFileSync(path.join(__dirname, 'failed-requests-list.hbs'), 'utf8');
// Create email generator
var template = Handlebars.compile(source);

var options = (email, locals) => {
  return {
    from: 'noreply@sr-accelerator.com',
    to: email,
    subject: 'List of Failed Requests for SRA Journal Request',
    html: template({ "failedRequests": locals })
  };
};

module.exports = (user, failedRequests) => {
  console.log("Failed Requests: ")
  console.log(failedRequests)
  return sendMail(options(user.email, failedRequests));
}