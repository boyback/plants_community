'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import styles from './TagSelector.module.scss';
import { cx } from '@/lib/style-utils';



interface Tag {
  id: string;
  name: string;
  count: number;
}

interface TagSelectorProps {
  value: string[];
  onChange: (tags: string[]) => void;
  max?: number;
  className?: string;
  controlClassName?: string;
}

export function TagSelector({ value, onChange, max = 6, className, controlClassName }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateDropdownPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const viewportGap = 12;
    const offset = 4;
    const width = Math.min(rect.width, window.innerWidth - viewportGap * 2);
    const left = Math.min(
      Math.max(viewportGap, rect.left),
      Math.max(viewportGap, window.innerWidth - width - viewportGap)
    );
    const belowSpace = window.innerHeight - rect.bottom - viewportGap - offset;
    const aboveSpace = rect.top - viewportGap - offset;
    const openUp = belowSpace < 180 && aboveSpace > belowSpace;
    const availableHeight = openUp ? aboveSpace : belowSpace;
    const maxHeight = Math.min(288, Math.max(160, availableHeight));
    const nextStyle: CSSProperties = {
      left,
      width,
      maxHeight
    };

    if (openUp) {
      nextStyle.bottom = Math.max(viewportGap, window.innerHeight - rect.top + offset);
    } else {
      nextStyle.top = Math.min(window.innerHeight - viewportGap, rect.bottom + offset);
    }

    setDropdownStyle(nextStyle);
  }, []);

  // 加载所有话题
  useEffect(() => {
    setLoading(true);
    fetch('/api/tags').
    then((r) => r.json()).
    then((data) => {
      // 确保返回的是数组
      if (Array.isArray(data)) {
        setAllTags(data);
      } else {
        console.error('Tags API returned non-array:', data);
        setAllTags([]);
      }
    }).
    catch((err) => {
      console.error('Failed to fetch tags:', err);
      setAllTags([]);
    }).
    finally(() => setLoading(false));
  }, []);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
      containerRef.current &&
      !containerRef.current.contains(target) &&
      !dropdownRef.current?.contains(target))
      {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setDropdownStyle(null);
      return;
    }

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  // 过滤话题
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

  useEffect(() => {
    if (isOpen) updateDropdownPosition();
  }, [filteredTags.length, isOpen, searchInput, updateDropdownPosition, value.length]);

  // 添加话题
  const addTag = (tagName: string) => {
    const name = tagName.trim().replace(/^#/, '');
    if (!name) return;
    if (value.includes(name)) return;
    if (value.length >= max) return;
    onChange([...value, name]);
    setSearchInput('');
  };

  // 移除话题
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

  const dropdown =
  isOpen && dropdownStyle && typeof document !== 'undefined' ?
  createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className={cx(styles.dropdownLayer, styles.r_92bf82f4, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8)}>
        {loading ?
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_77a2a20e, styles.r_8e63407b, styles.r_359090c2, styles.r_6c4cc49e)}>
            <span className={cx(styles.r_7fc7f732, styles.r_bf600f8e, styles.r_afbdd13a, styles.r_ac204c10, styles.r_65935df5, styles.r_691861bc, styles.r_d8241b8d)} />
            加载中...
          </div> :
      filteredTags.length === 0 ?
      <div className={cx(styles.r_c07e54fd, styles.r_ca6bf630, styles.r_359090c2, styles.r_6c4cc49e)}>
            {searchInput ? '没有找到匹配话题' : '暂无话题'}
            {canCreateTag &&
        <button
          type="button"
          onClick={() => addTag(normalizedInput)}
          className={cx(styles.r_0e12dc7d, styles.r_eccd13ef, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_359090c2, styles.r_2689f395, styles.r_5f6a59f1, styles.r_a5c39c39, styles.r_2efc423a)}>

                创建 #{normalizedInput}
              </button>
        }
          </div> :

      <div className={styles.r_cd009d7d}>
            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_d5eab218, styles.r_ec0091ee)}>
              <span className={cx(styles.r_1dc571a3, styles.r_2689f395, styles.r_6c4cc49e)}>
                {searchInput ? '搜索结果' : '热门话题'}
              </span>
              <span className={cx(styles.r_1dc571a3, styles.r_084c7b53)}>
                {value.length}/{max}
              </span>
            </div>
            {canCreateTag &&
        <button
          type="button"
          onClick={() => addTag(normalizedInput)}
          className={cx(styles.r_65281709, styles.r_60fbb771, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_a8a62ca4, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65, styles.r_fc7473ca, styles.r_5f6a59f1, styles.r_ceb69a6b, styles.r_a5c39c39, styles.r_5756b7b4)}>

                <span className={styles.r_2689f395}>创建 #{normalizedInput}</span>
                <span className={cx(styles.r_1dc571a3, styles.r_bb18baef)}>Enter</span>
              </button>
        }
            <div className={styles.r_e2eedc57}>
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
                className={cn(cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3, styles.r_421ac2be, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65, styles.r_fc7473ca, styles.r_ceb69a6b),

                isSelected ? cx(styles.r_7ebecbb6, styles.r_e7eab4cb) :

                isDisabled ? cx(styles.r_29b733e4, styles.r_a4157fd5) : cx(styles.r_5756b7b4, styles.r_eb6abb1f)


                )}>

                    <span className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_3960ffc2, styles.r_77a2a20e)}>
                      <span
                    className={cn(cx(styles.r_f3c543ad, styles.r_11e59c6d, styles.r_dc7972eb, styles.r_012fbd12, styles.r_67d66567, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_1dc571a3),

                    isSelected ? cx(styles.r_d3b27cd9, styles.r_45499621, styles.r_72a4c7cd) : cx(styles.r_691861bc, styles.r_f8c8e86d)


                    )}>

                        ✓
                      </span>
                      <span className={cx(styles.r_f283ea9b, styles.r_2689f395)}>#{tag.name}</span>
                    </span>
                    <span className={cx(styles.r_012fbd12, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_6c4cc49e)}>
                      {tag.count} 篇
                    </span>
                  </button>);

          })}
            </div>
          </div>
      }
      </div>,
    document.body
  ) :
  null;

  return (
    <div ref={containerRef} className={cn(styles.r_d89972fe, className)}>
      {/* 输入区域 */}
      <div
        className={cn(cx(styles.r_60fbb771, styles.r_b6c95e22, styles.r_9893fcaf, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_399e11a5, styles.r_ceb69a6b), styles.r_a5c39c39,


        controlClassName,
        isOpen && cx(styles.r_3883b0f9, styles.r_16b1efa5, styles.r_52c47100)
        )}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}>

        {/* 已选话题 */}
        {value.map((tag) =>
        <span
          key={tag}
          className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_359090c2, styles.r_2689f395, styles.r_5f6a59f1)}>

            #{tag}
            <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className={cx(styles.r_f3c543ad, styles.r_7fc7f732, styles.r_bf600f8e, styles.r_67d66567, styles.r_ac204c10, styles.r_b17d6a13, styles.r_2efc423a, styles.r_81be6435)}>

              ×
            </button>
          </span>
        )}

        {/* 输入框 */}
        <input
          ref={inputRef}
          className={cx(styles.r_1734f23d, styles.r_36e579c0, styles.r_7f19cdf4, styles.r_5a270a0c, styles.r_fc7473ca, styles.r_df37b1fd, styles.r_bacacabf)}
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={value.length >= max ? `最多 ${max} 个话题` : '输入或选择话题'}
          disabled={value.length >= max} />

      </div>

      {dropdown}
    </div>);

}
