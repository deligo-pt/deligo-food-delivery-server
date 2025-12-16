import Handlebars from 'handlebars';

Handlebars.registerHelper('eq', (a, b) => a === b);

export default Handlebars;
