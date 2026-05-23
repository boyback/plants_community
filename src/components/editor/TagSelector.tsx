'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Tag {
  id: string;
  name: string;
  count: number;
}

interface TagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
}

export function TagSelector({ value, onChange, max = 6 }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载所有标签
  useEffect(() => {
    setLoading(true);
    fetch('/api/tags')
      .then((r) => r.json())
      .then((data) => {
        // 确保返回的是数组
        if (Array.isArray(data)) {
          setAllTags(data);
        } else {
          console.error('Tags API returned non-array:', data);
          setAllTags([]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch tags:', err);
        setAllTags([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 过滤标签
  const filteredTags = allTags.filter((tag) => {
    if (!searchInput.trim()) return true;
    return tag.name.toLowerCase().includes(searchInput.toLowerCase());
  });
  const normalizedInput = searchInput.trim().replace(/^#/, '');
  const hasExactMatch = allTags.some(
    (tag) => tag.name.toLowerCase() === normalizedInput.toLowerCase()
  );
  const canCreateTag =
    normalizedInput.length > 0 && !hasExactMatch && value.length < max;

  // 添加标签
  const addTag = (tagName: string) => {
    const name = tagName.trim().replace(/^#/, '');
    if (!name) return;
    if (value.includes(name)) return;
    if (value.length >= max) return;
    onChange([...value, name]);
    setSearchInput('');
  };

  // 移除标签
  const removeTag = (tagName: string) => {
    onChange(value.filter((t) => t !== tagName));
  };

  // 处理输入框回车
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(searchInput);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* 输入区域 */}
      <div
        className={cn(
          'flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-leaf-200 bg-white px-2 py-1.5 transition-colors',
          'hover:border-leaf-300',
          isOpen && 'border-leaf-400 ring-2 ring-leaf-100'
        )}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        {/* 已选标签 */}
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-leaf-200 bg-leaf-50 px-2 py-0.5 text-xs font-medium text-leaf-700"
          >
            #{tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="grid h-3.5 w-3.5 place-items-center rounded-full text-leaf-600 hover:bg-leaf-100 hover:text-leaf-800"
            >
              ×
            </button>
          </span>
        ))}

        {/* 输入框 */}
        <input
          ref={inputRef}
          className="min-w-[140px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-leaf-700/45"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={value.length >= max ? `最多 ${max} 个标签` : '输入或选择标签'}
          disabled={value.length >= max}
        />
      </div>

      {/* 下拉卡片 */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-leaf-200 bg-white shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-4 text-xs text-leaf-700/60">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-leaf-200 border-t-leaf-500" />
              加载中...
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="p-5 text-center text-xs text-leaf-700/60">
              {searchInput ? '没有找到匹配标签' : '暂无标签'}
              {canCreateTag && (
                <button
                  type="button"
                  onClick={() => addTag(normalizedInput)}
                  className="mx-auto mt-3 flex items-center justify-center rounded-full border border-leaf-200 bg-leaf-50 px-3 py-1.5 text-xs font-medium text-leaf-700 hover:border-leaf-300 hover:bg-leaf-100"
                >
                  创建 #{normalizedInput}
                </button>
              )}
            </div>
          ) : (
            <div className="p-1.5">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-[10px] font-medium text-leaf-700/60">
                  {searchInput ? '搜索结果' : '热门标签'}
                </span>
                <span className="text-[10px] text-leaf-700/45">
                  {value.length}/{max}
                </span>
              </div>
              {canCreateTag && (
                <button
                  type="button"
                  onClick={() => addTag(normalizedInput)}
                  className="mb-1 flex w-full items-center justify-between rounded-md border border-dashed border-leaf-200 bg-leaf-50/60 px-3 py-2 text-left text-sm text-leaf-700 transition-colors hover:border-leaf-300 hover:bg-leaf-50"
                >
                  <span className="font-medium">创建 #{normalizedInput}</span>
                  <span className="text-[10px] text-leaf-700/55">Enter</span>
                </button>
              )}
              <div className="space-y-0.5">
                {filteredTags.map((tag) => {
                  const isSelected = value.includes(tag.name);
                  const isDisabled = !isSelected && value.length >= max;

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          removeTag(tag.name);
                        } else if (!isDisabled) {
                          addTag(tag.name);
                        }
                      }}
                      disabled={isDisabled}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        isSelected
                          ? 'bg-leaf-50 text-leaf-800'
                          : isDisabled
                          ? 'cursor-not-allowed text-leaf-400'
                          : 'hover:bg-leaf-50 text-ink-700'
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            'grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[10px]',
                            isSelected
                              ? 'border-leaf-500 bg-leaf-500 text-white'
                              : 'border-leaf-200 text-transparent'
                          )}
                        >
                          ✓
                        </span>
                        <span className="truncate font-medium">#{tag.name}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-leaf-50 px-2 py-0.5 text-[10px] text-leaf-700/60">
                        {tag.count} 篇
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
