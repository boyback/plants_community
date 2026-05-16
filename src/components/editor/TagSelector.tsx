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
          'flex flex-wrap items-center gap-1.5 border border-leaf-200 bg-white p-2 transition-colors cursor-text',
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
            className="inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-0.5 text-xs text-leaf-700"
          >
            #{tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="text-leaf-600 hover:text-leaf-800"
            >
              ×
            </button>
          </span>
        ))}

        {/* 输入框 */}
        <input
          ref={inputRef}
          className="flex-1 bg-transparent px-1 text-sm outline-none min-w-[120px]"
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
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-64 overflow-y-auto bg-white border border-leaf-200 shadow-lg">
          {loading ? (
            <div className="p-4 text-center text-xs text-leaf-700/60">加载中...</div>
          ) : filteredTags.length === 0 ? (
            <div className="p-4 text-center text-xs text-leaf-700/60">
              {searchInput ? (
                <>
                  没有找到标签，按回车创建 <span className="font-semibold">#{searchInput}</span>
                </>
              ) : (
                '暂无标签'
              )}
            </div>
          ) : (
            <div className="p-2">
              <div className="text-[10px] text-leaf-700/60 px-2 py-1 mb-1">
                {searchInput ? '搜索结果' : '热门标签'}
              </div>
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
                        'w-full flex items-center justify-between px-2 py-1.5 text-left text-sm transition-colors',
                        isSelected
                          ? 'bg-leaf-100 text-leaf-800'
                          : isDisabled
                          ? 'text-leaf-400 cursor-not-allowed'
                          : 'hover:bg-leaf-50 text-ink-700'
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        {isSelected && <span className="text-leaf-600">✓</span>}
                        <span>#{tag.name}</span>
                      </span>
                      <span className="text-[10px] text-leaf-600/60">{tag.count}</span>
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
