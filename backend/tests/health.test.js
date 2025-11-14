const request = require('supertest');
const { server, shutdown } = require('../index');

afterAll(async () => {
  await shutdown();
});

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const res = await request(server).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, status: 'healthy' });
  });
});
