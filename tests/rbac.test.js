const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');

let mongod;
let app;

function sampleContent(overrides = {}) {
  return {
    tasks: [
      {
        taskName: 'Implement feature',
        priority: 'high',
        plannedPercent: 100,
        actualPercent: 80,
        status: 'in_progress',
        timePlannedHours: 10,
        timeSpentHours: 8,
        output: 'Draft PR opened',
      },
    ],
    planForNextWeek: 'plan',
    blockers: [{ text: 'Waiting on review', isKey: true }],
    achievements: [{ text: 'Shipped a fix', isKey: true }],
    hoursByCategory: { development: 8, testing: 2, meetings: 1, documentation: 0 },
    notes: '',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = 'test-secret';
  process.env.CLIENT_ORIGIN = 'http://localhost:3000';

  await mongoose.connect(process.env.MONGO_URI);
  app = require('../app');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function registerAndLogin(role, email) {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'password123', role });

  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });

  return { token: res.body.token, userId: res.body.user.id };
}

describe('Role-based access control', () => {
  let managerToken;
  let memberToken;
  let otherMemberToken;
  let projectId;

  beforeAll(async () => {
    const manager = await registerAndLogin('manager', 'manager@test.com');
    managerToken = manager.token;

    const member = await registerAndLogin('team_member', 'member@test.com');
    memberToken = member.token;

    const otherMember = await registerAndLogin('team_member', 'other@test.com');
    otherMemberToken = otherMember.token;

    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Test Project' });
    projectId = projectRes.body.project._id;
  });

  test('unauthenticated request is rejected', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('team member cannot create a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Should Fail' });
    expect(res.status).toBe(403);
  });

  test('manager can create a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Manager Project' });
    expect(res.status).toBe(201);
  });

  test('team member cannot view the team reports dashboard route', async () => {
    const res = await request(app).get('/api/reports/team').set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  test('manager can view the team reports dashboard route', async () => {
    const res = await request(app).get('/api/reports/team').set('Authorization', `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
  });

  test('a team member can only edit their own report, not a colleague\'s', async () => {
    const createRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        project: projectId,
        weekStartDate: '2026-08-31',
        content: sampleContent(),
      });
    const reportId = createRes.body.report._id;

    const ownEdit = await request(app)
      .put(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ content: sampleContent({ planForNextWeek: 'updated plan' }) });
    expect(ownEdit.status).toBe(200);

    const otherEdit = await request(app)
      .put(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${otherMemberToken}`)
      .send({ content: sampleContent({ planForNextWeek: 'hijack' }) });
    expect(otherEdit.status).toBe(403);
  });

  test('team member cannot review a report', async () => {
    const createRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        project: projectId,
        weekStartDate: '2026-08-31',
        content: sampleContent(),
      });
    const reportId = createRes.body.report._id;
    await request(app).post(`/api/reports/${reportId}/submit`).set('Authorization', `Bearer ${memberToken}`);

    const res = await request(app)
      .post(`/api/reports/${reportId}/review`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ action: 'approved' });
    expect(res.status).toBe(403);
  });

  test('manager can review a submitted report', async () => {
    const createRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        project: projectId,
        weekStartDate: '2026-09-07',
        content: sampleContent(),
      });
    const reportId = createRes.body.report._id;
    await request(app).post(`/api/reports/${reportId}/submit`).set('Authorization', `Bearer ${memberToken}`);

    const res = await request(app)
      .post(`/api/reports/${reportId}/review`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ action: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.report.status).toBe('approved');
  });
});
