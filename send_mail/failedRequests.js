var fs = require('fs'),
    path = require('path'),
    Handlebars = require('handlebars'),
    sendMail = require('./sendMail.js');


// Helper to generate list
Handlebars.registerHelper('list', function(items, options) {
  var out = "<ol>";

  for(var i=0, l=items.length; i<l; i++) {
    if (items[i].title != "N.A.")
      out = out + "<li><b>Title:</b> " + options.fn(items[i].title) + "<br><b>Reason for failure:</b> " + items[i].error + "</li>";
    else if(items[i].doi)
      out = out + "<li><b>DOI:</b> " + options.fn(items[i].doi) + "<br><b>Reason for failure:</b> " + items[i].error + "</li>";
    else if (items[i].author != "N.A.")
      out = out + "<li><b>Author/s:</b> " + options.fn(items[i].author) + "<br><b>Reason for failure:</b> " + items[i].error + "</li>"; 
    else if(items[i].source)
      out = out + "<li><b>URL/s:</b> " + options.fn(items[i].source) + "<br><b>Reason for failure:</b> " + items[i].error + "</li>";
    else
      out = out + "<li>Article Title, DOI, Author and URL not found</li>";
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
    subject: 'List of Failed Requests for SRA Journal Request',
    html: template({ "failedRequests": locals })
  };
};

module.exports = (user, failedRequests) => {
  console.log("Failed Requests: ")
  console.log(failedRequests)
  return sendMail(options(user.email, failedRequests));
}