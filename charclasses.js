"use strict";

if (typeof define !== 'function') { var define = require('amdefine')(module); }

/** CharClasses.js
 *  This is a RequireJS module containing a few character classification functions
 *	are commonly used for code parsing.
 */
define( function() {

	function _isWhitespace(c) {
		return c === ' ' || c === '\n' || c === '\t';
	}
	
	function _isAlpha(c) {
		var lc = c.toLowerCase();
		return (lc >= 'a' && lc <= 'z');
	}

	function _isDigit(c) {
		return c >= '0' && c <= '9';
	}

	function _isAlnum(c) {
		return _isAlpha(c) || _isDigit(c);
	}

	function _isIdentifierStart(c) {
		return _isAlpha(c) || c === '_' || c === '$';
	}

	function _isIdentifierPart(c) {
		return _isIdentifierStart(c) || _isDigit(c);
	}
	
	return {
		isWhitespace: _isWhitespace,
		isAlpha: _isAlpha,
		isDigit: _isDigit,
		isAlnum: _isAlnum,
		isIdentifierStart: _isIdentifierStart,
		isIdentifierPart: _isIdentifierPart
	}
});