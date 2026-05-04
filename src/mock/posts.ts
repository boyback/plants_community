import type { Post, Comment, User } from '@/lib/types';
import { users } from './users';
import { boards } from './boards';

function mkComment(id: string, author: User, content: string, hoursAgo: number, likes = 0, replies?: Comment[]): Comment {
  return {
    id,
    author,
    content,
    createdAt: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
    likes,
    replies,
  };
}

const commonImg = [
  'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=1000',
  'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=1000',
  'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000',
  'https://images.unsplash.com/photo-1509587584298-0f3b3a3a1797?w=1000',
  'https://images.unsplash.com/photo-1466692476868-9ee5a3a3e93b?w=1000',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1000',
  'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=1000',
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000',
  'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=1000',
];

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400 * 1000).toISOString();
}

export const posts: Post[] = [
  {
    id: 'p1',
    type: 'rich',
    title: '夏天来了,我的景天们终于度夏成功!分享一下我的度夏经验',
    content: `
      <p>各位肉友大家好,我是<b>多肉阿绿</b>。今年华北的夏天异常炎热,但我的阳台军团居然全部度夏成功了 🎉</p>
      <p>先上几张刚刚拍的图:</p>
      <p>下面分享几个我觉得最关键的要点:</p>
      <ol>
        <li><b>通风第一位</b>。我把小风扇从早开到晚,即使 38 度也没有出现黑腐。</li>
        <li><b>遮阳 70%</b>。正午直射会把叶片晒软,我用了 70% 遮阳网。</li>
        <li><b>控水,不是断水</b>。整个夏天一个月给一次小水,沿盆边,傍晚进行。</li>
        <li><b>提前预防</b>。入夏前喷了一次代森锰锌,效果很好。</li>
      </ol>
      <p>希望对南方的朋友也有参考意义。评论区可以继续交流~</p>
    `,
    images: [commonImg[0], commonImg[1], commonImg[2]],
    cover: commonImg[0],
    author: users[0],
    board: boards[0],
    tags: ['度夏', '景天', '经验'],
    createdAt: daysAgo(1),
    likes: 328,
    comments: 42,
    shares: 15,
    views: 3842,
    commentList: [
      mkComment('c1', users[1], '太有用啦!我南方的肉肉今年全军覆没 😭', 12, 18),
      mkComment('c2', users[2], '通风确实是王道,我仙人球也是一样。', 10, 9),
      mkComment('c3', users[3], '请问代森锰锌和多菌灵哪个更好?', 8, 3),
      mkComment('c4', users[4], '学到了,明年试试。', 6, 5),
    ],
  },
  {
    id: 'p2',
    type: 'short',
    title: '今天拍到的生石花,刚蜕完皮',
    content: '刚蜕完皮的石头显得格外水灵,忍不住来晒一张。📸',
    images: [commonImg[3], commonImg[4]],
    cover: commonImg[3],
    author: users[6],
    board: boards[1],
    tags: ['生石花', '蜕皮', '晒图'],
    createdAt: daysAgo(2),
    likes: 156,
    comments: 21,
    shares: 3,
    views: 1203,
    commentList: [
      mkComment('c5', users[0], '好水灵!', 30, 2),
      mkComment('c6', users[5], '这是哪个品种呀?', 28, 1),
    ],
  },
  {
    id: 'p3',
    type: 'vote',
    title: '你觉得新手入坑最适合哪一种多肉?',
    content: '看到新手村一直有人问这个问题,不如大家投个票帮他们做个参考吧 🌱',
    author: users[5],
    board: boards[7],
    tags: ['新手', '投票'],
    createdAt: daysAgo(3),
    likes: 89,
    comments: 34,
    shares: 2,
    views: 2431,
    vote: {
      question: '新手最适合入坑的多肉是?',
      options: [
        { id: 'v1', label: '胧月(糖豆石莲系)', votes: 421 },
        { id: 'v2', label: '玉露(十二卷)', votes: 208 },
        { id: 'v3', label: '虹之玉(景天属)', votes: 312 },
        { id: 'v4', label: '仙人球(圆球即正义)', votes: 176 },
        { id: 'v5', label: '生石花(劝退专用)', votes: 54 },
      ],
      multi: false,
      deadline: daysAgo(-7),
    },
    commentList: [
      mkComment('c7', users[3], '我选胧月,便宜好养!', 60, 12),
      mkComment('c8', users[2], '生石花的选项笑死了 🤣', 55, 25),
    ],
  },
  {
    id: 'p4',
    type: 'video',
    title: '【配土教程】通用多肉配土,5 分钟学会',
    content: '把我的配土方子录成了视频,给新手朋友参考。',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    cover: commonImg[5],
    images: [commonImg[5]],
    author: users[2],
    board: boards[5],
    tags: ['配土', '教程', '视频'],
    createdAt: daysAgo(4),
    likes: 512,
    comments: 78,
    shares: 45,
    views: 8421,
    commentList: [
      mkComment('c9', users[0], '老王出品,必属精品 👍', 80, 20),
      mkComment('c10', users[7], '请问稻壳炭去哪里买啊?', 75, 5),
    ],
  },
  {
    id: 'p5',
    type: 'event',
    title: '【线下活动】8 月 20 日·北京·多肉交流茶话会',
    content: '由本版主发起,邀请京津冀肉友线下面基,带上你家的肉肉,一起喝茶聊肉!现场还有<b>盲盒交换</b>环节 🎁',
    cover: commonImg[6],
    images: [commonImg[6]],
    author: users[0],
    board: boards[0],
    tags: ['线下', '活动', '北京'],
    createdAt: daysAgo(5),
    likes: 234,
    comments: 55,
    shares: 30,
    views: 4213,
    event: {
      startAt: daysAgo(-20),
      endAt: daysAgo(-20),
      location: '北京市朝阳区某咖啡馆',
      attendees: 42,
    },
    commentList: [
      mkComment('c11', users[1], '报名 +1,带两棵玉露过去!', 100, 8),
      mkComment('c12', users[4], '北京肉友集结啦 🥳', 98, 5),
    ],
  },
  {
    id: 'p6',
    type: 'rich',
    title: '玉露叶片扦插的完整记录(持续更新)',
    content: `
      <p>从 6 月 1 日开始记录,每周拍一次照。</p>
      <p><b>Day 1</b>:掰下来健康叶片,伤口晾 3 天。</p>
      <p><b>Day 14</b>:根点出现。</p>
      <p><b>Day 30</b>:小芽探头。</p>
      <p><b>Day 60</b>:移盆!</p>
      <p>关键:避光 + 不浇水只喷水雾。</p>
    `,
    images: [commonImg[7], commonImg[8]],
    cover: commonImg[7],
    author: users[1],
    board: boards[2],
    tags: ['玉露', '扦插', '记录'],
    createdAt: daysAgo(6),
    likes: 198,
    comments: 28,
    shares: 12,
    views: 2132,
    commentList: [
      mkComment('c13', users[3], '收藏了!新手必看。', 140, 10),
    ],
  },
  {
    id: 'p7',
    type: 'short',
    title: '今日份的阳台',
    content: '阳光正好,微风不燥,肉肉们都乖乖的。☀️🌿',
    images: [commonImg[0]],
    cover: commonImg[0],
    author: users[3],
    board: boards[5],
    tags: ['日常'],
    createdAt: daysAgo(7),
    likes: 62,
    comments: 8,
    shares: 0,
    views: 421,
    commentList: [],
  },
  {
    id: 'p8',
    type: 'vote',
    title: '你家肉肉的盆用哪种材质?',
    content: '想换盆,纠结选哪种,来投个票看看大家的选择。',
    author: users[4],
    board: boards[5],
    tags: ['盆器', '投票'],
    createdAt: daysAgo(8),
    likes: 76,
    comments: 19,
    shares: 1,
    views: 1021,
    vote: {
      question: '你最常用哪种盆?',
      options: [
        { id: 'v1', label: '红陶盆(呼吸好)', votes: 152 },
        { id: 'v2', label: '瓷盆(颜值党)', votes: 98 },
        { id: 'v3', label: '塑料盆(便宜大碗)', votes: 87 },
        { id: 'v4', label: '紫砂盆(装逼首选)', votes: 41 },
      ],
      multi: false,
      deadline: daysAgo(-3),
    },
    commentList: [],
  },
  {
    id: 'p9',
    type: 'rich',
    title: '仙人球开花全记录——从花苞到凋谢只有 12 小时',
    content: `
      <p>昨晚惊喜地发现我的<b>艾伦费尔德</b>冒花苞了,今天一早拍到了惊艳的开花瞬间。</p>
      <p>仙人球的花通常只开一天,错过就是一年。所以我架了三脚架全程守候。</p>
      <p>结论:<i>仙人球值得!</i></p>
    `,
    images: [commonImg[4], commonImg[3]],
    cover: commonImg[4],
    author: users[2],
    board: boards[3],
    tags: ['仙人球', '开花', '延时'],
    createdAt: daysAgo(9),
    likes: 412,
    comments: 63,
    shares: 21,
    views: 6213,
    commentList: [
      mkComment('c14', users[0], '太美了!!!', 200, 18),
    ],
  },
  {
    id: 'p10',
    type: 'short',
    title: '出几棵多头胧月,坐标北京,自提优先',
    content: '如图,多头饱满,上色漂亮。¥80 一棵,同城自提优先。私信联系。',
    images: [commonImg[1], commonImg[2]],
    cover: commonImg[1],
    author: users[5],
    board: boards[6],
    tags: ['出肉', '北京', '胧月'],
    createdAt: daysAgo(10),
    likes: 45,
    comments: 12,
    shares: 0,
    views: 612,
    commentList: [],
  },
  {
    id: 'p11',
    type: 'rich',
    title: '救救我的吉娃娃!叶片发软是怎么回事?',
    content: `
      <p>新手求助 🙏 我的吉娃娃最近叶片发软,中心有点发黑,是黑腐还是正常?</p>
      <p>养护环境:南阳台,配土是<b>市售多肉专用土</b>,一周浇一次水。</p>
      <p>附图求诊!</p>
    `,
    images: [commonImg[2]],
    cover: commonImg[2],
    author: users[3],
    board: boards[7],
    tags: ['求助', '吉娃娃', '黑腐'],
    createdAt: daysAgo(11),
    likes: 23,
    comments: 35,
    shares: 0,
    views: 1021,
    commentList: [
      mkComment('c15', users[2], '典型的浇多水了,赶紧控水,移到通风处。', 240, 22),
      mkComment('c16', users[0], '拔出来看根,如果根黑了要切掉重新生根。', 230, 15),
    ],
  },
  {
    id: 'p12',
    type: 'video',
    title: '我家阳台一年的变化(延时摄影)',
    content: '用手机拍了整整 365 天,剪成 2 分钟的延时。',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    cover: commonImg[6],
    images: [commonImg[6]],
    author: users[5],
    board: boards[5],
    tags: ['延时', '阳台', 'vlog'],
    createdAt: daysAgo(12),
    likes: 789,
    comments: 124,
    shares: 89,
    views: 12421,
    commentList: [],
  },
];

export function getPostById(id: string): Post | undefined {
  return posts.find((p) => p.id === id);
}

export function getPostsByBoard(boardId: string): Post[] {
  return posts.filter((p) => p.board.id === boardId);
}

export function getPostsByAuthor(userId: string): Post[] {
  return posts.filter((p) => p.author.id === userId);
}
