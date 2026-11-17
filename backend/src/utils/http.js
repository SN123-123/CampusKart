// Wrap async route handlers so errors reach the error handler
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Throw an error that carries an HTTP status code
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { wrap, httpError };
