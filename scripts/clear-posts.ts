import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllPosts() {
  console.log('开始清空所有帖子数据...\n');

  try {
    // 按依赖顺序删除相关数据
    console.log('1. 删除投票记录...');
    const voteRecords = await prisma.voteRecord.deleteMany({});
    console.log(`   ✓ 已删除 ${voteRecords.count} 条投票记录`);

    console.log('2. 删除投票...');
    const votes = await prisma.vote.deleteMany({});
    console.log(`   ✓ 已删除 ${votes.count} 个投票`);

    console.log('3. 删除活动参与者...');
    const attendees = await prisma.eventAttendee.deleteMany({});
    console.log(`   ✓ 已删除 ${attendees.count} 条活动参与记录`);

    console.log('4. 删除活动...');
    const events = await prisma.event.deleteMany({});
    console.log(`   ✓ 已删除 ${events.count} 个活动`);

    console.log('5. 删除日志条目...');
    const journalEntries = await prisma.journalEntry.deleteMany({});
    console.log(`   ✓ 已删除 ${journalEntries.count} 条日志条目`);

    console.log('6. 删除日志...');
    const journals = await prisma.journal.deleteMany({});
    console.log(`   ✓ 已删除 ${journals.count} 个日志`);

    console.log('7. 删除评论...');
    const comments = await prisma.comment.deleteMany({});
    console.log(`   ✓ 已删除 ${comments.count} 条评论`);

    console.log('8. 删除帖子点赞...');
    const likes = await prisma.postLike.deleteMany({});
    console.log(`   ✓ 已删除 ${likes.count} 条点赞记录`);

    console.log('9. 删除帖子收藏...');
    const collects = await prisma.postCollect.deleteMany({});
    console.log(`   ✓ 已删除 ${collects.count} 条收藏记录`);

    console.log('10. 删除帖子浏览记录...');
    const views = await prisma.postView.deleteMany({});
    console.log(`   ✓ 已删除 ${views.count} 条浏览记录`);

    console.log('11. 删除帖子举报...');
    const reports = await prisma.report.deleteMany({
      where: { targetType: 'post' }
    });
    console.log(`   ✓ 已删除 ${reports.count} 条举报记录`);

    console.log('12. 删除帖子相关通知...');
    const notifications = await prisma.notification.deleteMany({
      where: {
        OR: [
          { type: 'like' },
          { type: 'comment' }
        ]
      }
    });
    console.log(`   ✓ 已删除 ${notifications.count} 条通知`);

    console.log('13. 删除所有帖子...');
    const posts = await prisma.post.deleteMany({});
    console.log(`   ✓ 已删除 ${posts.count} 个帖子`);

    console.log('\n✅ 所有帖子数据已清空！');
  } catch (error) {
    console.error('❌ 删除失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearAllPosts()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
