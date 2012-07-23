"use strict";

var expect = require('expect.js');

var customError = require('../customErrors');

suite('doggybag/customErrors', function () {

  var HTTPResponseError = customError.HTTPResponseError

  test('check API', function () {
    [
      'HTTPResponseError',
      'NotFoundError',
      'InternalServerError',
      'DemoError'
    ].forEach(function (prop) {
        expect(customError[prop]).to.be.a('function');
      });
  });

  test('HTTPResponseError expectations', function () {
    try{
      throw new customError.HTTPResponseError(412, 'Catchemall')
    }
    catch(e){
      expect(e).to.be.an('object');
      expect(e.statusCode).to.be.an('number');
    }
  });

  test('NotFoundError expectations', function () {
    try{
      throw new customError.NotFoundError('Catchemall')
    }
    catch(e){
      expect(e).to.be.an(HTTPResponseError);
      expect(e.statusCode).to.equal(404);
    }
  });

  test('InternalServerError expectations', function () {
    try{
      throw new customError.InternalServerError('Catchemall')
    }
    catch(e){
      expect(e).to.be.an(HTTPResponseError);
      expect(e.statusCode).to.equal(500);
    }
  });

  test('DemoError expectations', function () {
    try{
      throw new customError.DemoError('Catchemall')
    }
    catch(e){
      expect(e).to.be.an('object');
    }
  });



});