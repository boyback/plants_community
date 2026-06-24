'use client';

import { useEffect, useMemo, useState } from 'react';
import { MultiSelect, type SelectOption } from '@/components/ui/Select';

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

export function TagSelector({ value, onChange, className, controlClassName }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/tags')
      .then((r) => r.json())
      .then((data) => {
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

  const options = useMemo<SelectOption[]>(() => {
    const existing = allTags.map((tag) => ({
      value: tag.name,
      label: `#${tag.name}`,
      count: tag.count,
    }));
    const missingSelected = value
      .filter((tag) => !existing.some((option) => normalizeTag(option.value) === normalizeTag(tag)))
      .map((tag) => ({
        value: normalizeTag(tag),
        label: `#${normalizeTag(tag)}`,
        custom: true,
      }));
    return [...missingSelected, ...existing];
  }, [allTags, value]);

  const normalizedValue = useMemo(() => value.map(normalizeTag).filter(Boolean), [value]);

  const handleChange = (next: string[]) => {
    onChange(next.map(normalizeTag).filter(Boolean));
  };

  const handleCreate = (input: string) => {
    const tag = normalizeTag(input);
    if (!tag || normalizedValue.includes(tag)) return;
    onChange([...normalizedValue, tag]);
  };

  return (
    <MultiSelect
      creatable
      compact
      isLoading={loading}
      options={options}
      value={normalizedValue}
      onValueChange={handleChange}
      onCreateOption={handleCreate}
      placeholder="选择或创建话题"
      noOptionsMessage={loading ? '加载中...' : '没有找到匹配话题'}
      wrapperClassName={className}
      className={controlClassName}
    />
  );
}

function normalizeTag(value: string) {
  return value.trim().replace(/^#/, '');
}
