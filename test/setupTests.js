import '@testing-library/jest-dom';
// jsdom doesn't implement Element.scrollIntoView; provide a no-op for tests
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
	Element.prototype.scrollIntoView = function () {};
}
