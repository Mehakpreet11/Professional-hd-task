const sanitizeHtml = require("sanitize-html");

function sanitizeMessage(msg) {
  // Strip all HTML tags and attributes
  return sanitizeHtml(msg, {
    allowedTags: [],      // no tags allowed
    allowedAttributes: {}, 
  });
}

module.exports = sanitizeMessage;
