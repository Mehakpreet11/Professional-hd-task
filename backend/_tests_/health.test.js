const http = require('http');

test('health endpoint returns ok', done => {
  http.get('http://localhost:5001/health', res => {
    expect(res.statusCode).toBeLessThan(500);
    done();
  }).on('error', done);
});
