"use strict";

function HTTPResponseError(code, msg){
  Error.call(this, msg);
  Error.captureStackTrace(this, HTTPResponseError);

  this.statusCode = code || 500;
  this.name = 'HTTP Error ('+this.statusCode+')';
  this.message = msg
}
HTTPResponseError.prototype = Object.create(Error.prototype);


function NotFoundError(msg) {
  HTTPResponseError.call(this, 404, msg || 'Not Found');
  this.name = 'HTTP NotFound Error';
  Error.captureStackTrace(this, NotFoundError);
}
NotFoundError.prototype = Object.create(HTTPResponseError.prototype);


function InternalServerError(msg){
  HTTPResponseError.call(this, 500, msg || 'Internal Server Error');
  this.name = 'HTTP Internal Server Error';
  Error.captureStackTrace(this, InternalServerError);
}
InternalServerError.prototype = Object.create(HTTPResponseError.prototype);


function DemoError(msg) {
  Error.call(this, msg || 'Restricted for demo account');
  this.name = 'Demo Error';
  Error.captureStackTrace(this, DemoError);
}
DemoError.prototype = Object.create(Error.prototype);



module.exports = {
  HTTPResponseError:   HTTPResponseError,
  NotFoundError:       NotFoundError,
  InternalServerError: InternalServerError,
  Demo:                DemoError
};

