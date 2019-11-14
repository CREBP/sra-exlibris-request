var fs = require('fs'),
    path = require('path'),
    Handlebars = require('handlebars'),
    sendMail = require('./sendMail.js');


// Helper to generate list
Handlebars.registerHelper('list', function(items, options) {
  var out = "<ol>";

  for(var i=0, l=items.length; i<l; i++) {
    out += "<li><b>Title:</b> " + options.fn(items[i].title);
    out += "<br><b>Author/s:</b> " + options.fn(items[i].author); 
    out += "<br><b>Year:</b> " + options.fn(items[i].year);
    out += "<br><i>Reason for failure:</i> " + items[i].error + "<br><br></li>";
  }

  return out + "</ol>";
});

// Open template file
var source = fs.readFileSync(path.join(__dirname, 'failed-requests-list.hbs'), 'utf8');
// Create email generator
var template = Handlebars.compile(source);

var options = (email, locals) => {
  return {
    from: 'noreply@sr-accelerator.com',
    to: email,
    subject: 'SRA Journal Request Results',
    html: template(locals)
  };
};

module.exports = (user, failedRequests, numRequests) => {
  // console.log("Failed Requests: ")
  // console.log(failedRequests)
  return sendMail(options(user.email, { "failedRequests": failedRequests, "numRequests": numRequests, "numSuccess": numRequests-failedRequests.length }));
}