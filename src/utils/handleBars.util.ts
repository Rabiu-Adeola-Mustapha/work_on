import Handlebars = require("handlebars");

Handlebars.registerHelper("equalsCOD", function (value) {
  return value === "cod";
});
Handlebars.registerHelper("isDefined", function (value) {
  return value !== undefined;
});
Handlebars.registerHelper("equalsRegular", function (value) {
  return value === "regular";
});

export default {
  compileHtml: Handlebars.compile,
};
