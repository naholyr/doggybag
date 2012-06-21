var sinon = require('sinon');

module.exports = {
  "validate":sinon.stub().callsArg(1),
  "run":sinon.stub().callsArg(1)
};
