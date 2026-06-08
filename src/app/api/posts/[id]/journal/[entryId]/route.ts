import { fail, handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async () => {
  return fail(400, '已创建的成长记录不能二次编辑，只能继续新增记录');
});

export const DELETE = handler(async () => {
  return fail(400, '已创建的成长记录不能删除，只能继续新增记录');
});
