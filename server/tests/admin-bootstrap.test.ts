import test from 'node:test';
import assert from 'node:assert/strict';
import { roleAfterAdminDemotion, adminPromotionBlocker } from '../src/services/admin-bootstrap.service.js';

test('a demoted admin with an approved host application keeps host access', () => {
  assert.equal(roleAfterAdminDemotion({ hasApprovedHostApplication: true, ownsProperties: false }), 'HOST');
});

test('a demoted admin who owns listings keeps host access', () => {
  assert.equal(roleAfterAdminDemotion({ hasApprovedHostApplication: false, ownsProperties: true }), 'HOST');
});

test('a demoted admin with no host activity becomes a plain user', () => {
  assert.equal(roleAfterAdminDemotion({ hasApprovedHostApplication: false, ownsProperties: false }), 'USER');
});

test('a host cannot be made the platform admin', () => {
  assert.ok(adminPromotionBlocker({ role: 'HOST', hasHostApplication: false, ownsProperties: false }));
});

test('a user with a host application or listings cannot be made the platform admin', () => {
  assert.ok(adminPromotionBlocker({ role: 'USER', hasHostApplication: true, ownsProperties: false }));
  assert.ok(adminPromotionBlocker({ role: 'USER', hasHostApplication: false, ownsProperties: true }));
});

test('a plain user can be made the platform admin', () => {
  assert.equal(adminPromotionBlocker({ role: 'USER', hasHostApplication: false, ownsProperties: false }), null);
});
