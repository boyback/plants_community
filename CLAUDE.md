# 项目规范

## 环境要求

- **Node.js**: >= 20.x
- **包管理器**: npm 或 pnpm

## 消息提示 (Toast)

### 统一使用 react-hot-toast

项目使用 `react-hot-toast` 进行消息提示，**禁止**使用手写的本地 state 实现。

### 导入方式

```tsx
import { toast } from '@/components/ui/Toast';
```

### 使用方式

```tsx
// 成功提示
toast.success('操作成功');

// 错误提示
toast.error('操作失败');

// 加载中提示
toast.loading('处理中...');
```

### 禁止的做法

```tsx
// ❌ 禁止：手写 toast state
const [toast, setToast] = useState<string | null>(null);
const showToast = (s: string) => {
  setToast(s);
  setTimeout(() => setToast(null), 2200);
};

// ❌ 禁止：手写 toast DOM
{toast && (
  <div className="...">{toast}</div>
)}
```

### 原因

1. **统一性**：所有提示使用相同的样式和行为
2. **可访问性**：react-hot-toast 自带屏幕阅读器支持
3. **维护性**：避免重复代码
4. **AI 工具友好**：统一的调用方式，便于 AI 工具理解和修改

## 对话框

### 禁止使用 alert

**禁止**使用浏览器的 `alert()` 进行用户提示，统一使用 `toast` 或 `confirm()` + `toast` 组合。

```tsx
// ❌ 禁止
alert('操作失败');

// ✅ 正确
toast.error('操作失败');
```

### confirm 的使用

删除等危险操作的二次确认，应使用 `ConfirmPopover` 气泡确认框组件，禁止使用原生 `confirm()`。

```tsx
// ✅ 正确：使用气泡确认框
import { ConfirmPopover } from '@/components/ui/ConfirmPopover';

<ConfirmPopover
  title="确定删除？"
  message="此操作不可恢复"
  confirmText="删除"
  danger
  onConfirm={handleDelete}
>
  <button>删除</button>
</ConfirmPopover>
```

```tsx
// ❌ 禁止：使用原生 confirm
if (!confirm('确定删除?')) return;
await api.delete(id);
```

### 组件导出

```tsx
import { ConfirmPopover, DangerConfirmPopover } from '@/components/ui/ConfirmPopover';

// DangerConfirmPopover - 专用于删除等危险操作（红色按钮）
<DangerConfirmPopover title="确定删除？" onConfirm={handleDelete}>
  <button>删除</button>
</DangerConfirmPopover>
```