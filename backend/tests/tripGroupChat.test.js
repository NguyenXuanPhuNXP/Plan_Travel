import test from 'node:test';
import assert from 'node:assert/strict';
import * as itineraryService from '../src/services/itineraryService.js';
import * as chatService from '../src/services/chatService.js';
import * as sharingService from '../src/services/sharingService.js';
import prisma from '../src/config/db.js';

test('Packing Catalog - Enriched catalog contains >= 60 diverse travel items', async () => {
  const catalog = await itineraryService.getPackingCatalog();
  assert.ok(catalog.length >= 60, `Catalog should contain at least 60 items, got ${catalog.length}`);

  const categories = [...new Set(catalog.map(i => i.category))];
  assert.ok(categories.includes('clothing'));
  assert.ok(categories.includes('devices'));
  assert.ok(categories.includes('tools'));
  assert.ok(categories.includes('accessories'));
  assert.ok(categories.includes('documents'));
  assert.ok(categories.includes('medical'));

  // Verify winter/outdoor/beach items were added
  const winterItem = catalog.find(i => i.name.includes('Áo len') || i.name.includes('giữ nhiệt'));
  assert.ok(winterItem, 'Must have winter/warm items');

  const beachItem = catalog.find(i => i.name.includes('Kính bơi') || i.name.includes('chống nước'));
  assert.ok(beachItem, 'Must have beach/water items');

  const outdoorItem = catalog.find(i => i.name.includes('Đèn pin') || i.name.includes('leo núi'));
  assert.ok(outdoorItem, 'Must have outdoor/trekking items');
});

test('Trip Group - Create trip with friend adds them to group and initializes group chat', async () => {
  // Ensure we have two test users
  const users = await prisma.users.findMany({ take: 2 });
  assert.ok(users.length >= 1);

  let owner = users[0];
  let friend = users[1];
  if (!friend) {
    friend = await prisma.users.create({
      data: {
        email: `friend_${Date.now()}@example.com`,
        full_name: 'Người Bạn Đồng Hành',
        password_hash: 'dummy'
      }
    });
  }

  const created = await itineraryService.createItinerary(owner.id, {
    name: 'Chuyến đi thử nghiệm nhóm',
    destination: 'Đà Lạt',
    collaboratorIds: [friend.id.toString()]
  });

  try {
    // 1. Verify collaborator is added
    const collabs = await prisma.itinerary_collaborators.findMany({
      where: { itinerary_id: BigInt(created.id) }
    });
    assert.equal(collabs.length, 1);
    assert.equal(collabs[0].user_id.toString(), friend.id.toString());

    // 2. Verify initial group chat message exists
    const messages = await chatService.getTripGroupMessages(created.id, owner.id);
    assert.ok(messages.length >= 1);
    assert.ok(messages[0].content.includes('[Hệ thống]'));

    // 3. Verify friend can also access group chat
    const friendMessages = await chatService.getTripGroupMessages(created.id, friend.id);
    assert.equal(friendMessages.length, messages.length);

    // 4. Verify trip appears in both users' getTripGroups
    const ownerGroups = await chatService.getTripGroups(owner.id);
    assert.ok(ownerGroups.some(g => g.id === created.id));

    const friendGroups = await chatService.getTripGroups(friend.id);
    assert.ok(friendGroups.some(g => g.id === created.id));
  } finally {
    await itineraryService.deleteItinerary(created.id, owner.id);
  }
});

test('Trip Group - Send and receive group messages among collaborators', async () => {
  const users = await prisma.users.findMany({ take: 2 });
  const owner = users[0];
  let friend = users[1];
  if (!friend) {
    friend = await prisma.users.create({
      data: {
        email: `friend2_${Date.now()}@example.com`,
        full_name: 'Bạn Du Lịch',
        password_hash: 'dummy'
      }
    });
  }

  const created = await itineraryService.createItinerary(owner.id, {
    name: 'Nhóm Thảo Luận Đà Nẵng',
    destination: 'Đà Nẵng',
    collaboratorIds: [friend.id.toString()]
  });

  try {
    // Owner sends message
    const msg1 = await chatService.sendTripGroupMessage(created.id, owner.id, 'Chào cả nhóm! Mình chốt ngày 15 đi nhé.');
    assert.equal(msg1.content, 'Chào cả nhóm! Mình chốt ngày 15 đi nhé.');
    assert.equal(msg1.senderId, owner.id.toString());

    // Friend sends message
    const msg2 = await chatService.sendTripGroupMessage(created.id, friend.id, 'Nhất trí, mình sẽ chuẩn bị vé máy bay!');
    assert.equal(msg2.content, 'Nhất trí, mình sẽ chuẩn bị vé máy bay!');
    assert.equal(msg2.senderId, friend.id.toString());

    // Check conversation history
    const history = await chatService.getTripGroupMessages(created.id, owner.id);
    assert.ok(history.length >= 3); // initial system message + msg1 + msg2
    assert.ok(history.some(m => m.content === 'Chào cả nhóm! Mình chốt ngày 15 đi nhé.'));
    assert.ok(history.some(m => m.content === 'Nhất trí, mình sẽ chuẩn bị vé máy bay!'));
  } finally {
    await itineraryService.deleteItinerary(created.id, owner.id);
  }
});

test('Trip Group - Non-members are forbidden from viewing or sending group messages', async () => {
  const users = await prisma.users.findMany({ take: 3 });
  const owner = users[0];
  let outsider = users[2];
  if (!outsider) {
    outsider = await prisma.users.create({
      data: {
        email: `outsider_${Date.now()}@example.com`,
        full_name: 'Người Ngoài Nhóm',
        password_hash: 'dummy'
      }
    });
  }

  const created = await itineraryService.createItinerary(owner.id, {
    name: 'Chuyến Đi Riêng Tư',
    destination: 'Sa Pa'
  });

  try {
    // Outsider trying to view messages
    await assert.rejects(
      async () => {
        await chatService.getTripGroupMessages(created.id, outsider.id);
      },
      (err) => err.status === 403
    );

    // Outsider trying to send message
    await assert.rejects(
      async () => {
        await chatService.sendTripGroupMessage(created.id, outsider.id, 'Tôi muốn tham gia');
      },
      (err) => err.status === 403
    );
  } finally {
    await itineraryService.deleteItinerary(created.id, owner.id);
  }
});

test('Trip Group - Adding collaborator via sharing service announces in group chat', async () => {
  const users = await prisma.users.findMany({ take: 2 });
  const owner = users[0];
  const newFriend = await prisma.users.create({
    data: {
      email: `invited_${Date.now()}@example.com`,
      full_name: 'Thành Viên Mới Mời',
      password_hash: 'dummy'
    }
  });

  const created = await itineraryService.createItinerary(owner.id, {
    name: 'Chuyến Đi Mời Bạn',
    destination: 'Nha Trang'
  });

  try {
    // Add collaborator by userId
    await sharingService.addCollaborator(created.id, owner.id, {
      userId: newFriend.id.toString(),
      permission: 'edit'
    });

    const messages = await chatService.getTripGroupMessages(created.id, owner.id);
    const joinAnnouncement = messages.find(m => m.content.includes('Thành Viên Mới Mời') && m.content.includes('[Hệ thống]'));
    assert.ok(joinAnnouncement, 'Must announce new member in group chat');
  } finally {
    await itineraryService.deleteItinerary(created.id, owner.id);
  }
});
