const request = require('supertest');
const { createApp } = require('../src/app');

test('GET /api/health responde ok', async () => {
  const res = await request(createApp()).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ estado: 'ok' });
});
