'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import type { Board, BoardLevel } from '@/lib/types';

type BoardNode = Board & {
  latinName?: string | null;
  genera?: BoardNode[];
  species?: BoardNode[];
};

export interface BoardSelection {
  categorySlug: string;
  genusSlug: string;
  speciesSlug: string;
  label?: string;
}

interface BoardOption extends BoardSelection {
  key: string;
  level: BoardLevel;
  label: string;
  title: string;
  pathLabel: string;
  searchText: string;
}

interface SingleBoardSelectProps {
  value: BoardSelection;
  onChange: (value: BoardSelection) => void;
  multiple?: false;
  apiPath?: string;
  placeholder?: string;
  invalid?: boolean;
  autoSelectFirst?: boolean;
}

interface MultiBoardSelectProps {
  multiple: true;
  values: BoardSelection[];
  onValuesChange: (values: BoardSelection[]) => void;
  apiPath?: string;
  placeholder?: string;
  invalid?: boolean;
  max?: number;
}

const RECENT_STORAGE_KEY = 'rouyou.editor.recentBoards';
const RECENT_LIMIT = 5;

export function BoardSelect(props: SingleBoardSelectProps | MultiBoardSelectProps) {
  const {
    apiPath = '/api/boards?withSpecies=1',
    placeholder = '搜索并选择板块',
    invalid = false,
  } = props;

  const isMultiple = props.multiple === true;
  const max = isMultiple ? props.max ?? 12 : 1;
  const [boards, setBoards] = useState<BoardNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<BoardNode[]>(apiPath)
      .then((list) => {
        if (!cancelled) setBoards(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setBoards([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiPath]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setRecentKeys(parsed.filter((item): item is string => typeof item === 'string'));
      }
    } catch {
      setRecentKeys([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const options = useMemo(() => buildBoardOptions(boards), [boards]);
  const optionByKey = useMemo(() => new Map(options.map((option) => [option.key, option])), [options]);

  const selectedValues: BoardSelection[] = isMultiple ? props.values : [props.value];
  const selectedOptions = useMemo(
    () =>
      selectedValues
        .map((value) => options.find((option) => isSameSelection(option, value)))
        .filter((option): option is BoardOption => Boolean(option)),
    [options, selectedValues],
  );
  const selectedKeys = useMemo(() => new Set(selectedOptions.map((option) => option.key)), [selectedOptions]);
  const selectedOption = selectedOptions[0] ?? null;

  const visibleOptions = useMemo(() => {
    const q = query.trim();
    if (!q) {
      const recentOptions = recentKeys
        .map((key) => optionByKey.get(key))
        .filter((option): option is BoardOption => Boolean(option));
      const seen = new Set(recentOptions.map((option) => option.key));
      return [...recentOptions, ...options.filter((option) => !seen.has(option.key))];
    }
    return options.filter((option) => fuzzyMatch(option.searchText, q));
  }, [optionByKey, options, query, recentKeys]);

  useEffect(() => {
    if (isMultiple) return;
    if (
      props.autoSelectFirst &&
      options[0] &&
      !props.value.categorySlug &&
      !props.value.genusSlug &&
      !props.value.speciesSlug
    ) {
      props.onChange(pickSelection(options[0]));
    }
  }, [isMultiple, options, props]);

  const saveRecentOption = (key: string) => {
    setRecentKeys((prev) => {
      const next = [key, ...prev.filter((item) => item !== key)].slice(0, RECENT_LIMIT);
      try {
        window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const chooseOption = (option: BoardOption) => {
    saveRecentOption(option.key);

    if (isMultiple) {
      if (selectedKeys.has(option.key)) {
        props.onValuesChange(props.values.filter((item) => !isSameSelection(option, item)));
      } else if (props.values.length < max) {
        props.onValuesChange([
          ...props.values,
          { ...pickSelection(option), label: formatBoardPathLabel(option) },
        ]);
      }
      setQuery('');
      setOpen(true);
      window.requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }

    props.onChange({ ...pickSelection(option), label: formatBoardPathLabel(option) });
    setQuery('');
    setOpen(false);
  };

  const removeOption = (option: BoardOption) => {
    if (!isMultiple) return;
    props.onValuesChange(props.values.filter((item) => !isSameSelection(option, item)));
  };

  const displayValue = isMultiple
    ? query
    : open
      ? query
      : selectedOption
        ? formatSelectedValue(selectedOption)
        : '';
  const disabled = isMultiple && props.values.length >= max;

  return (
    <div ref={containerRef} className="relative flex-1">
      {isMultiple ? (
        <div
          className={cn(
            'flex min-h-10 w-full flex-wrap items-center gap-1.5 border border-leaf-200 bg-white px-2 py-1.5 text-sm outline-none transition-colors focus-within:border-leaf-400 focus-within:ring-2 focus-within:ring-leaf-100',
            invalid && 'border-rose-300 bg-rose-50/30 focus-within:border-rose-300 focus-within:ring-rose-100',
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {selectedOptions.map((option) => (
            <span
              key={option.key}
              className="inline-flex max-w-full items-center gap-1 bg-leaf-100 px-2 py-0.5 text-xs text-leaf-700"
            >
              <span className="truncate">{formatBoardPathLabel(option)}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  removeOption(option);
                }}
                className="shrink-0 text-leaf-600 hover:text-leaf-900"
              >
                x
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setOpen(true);
                setActiveIndex((index) => Math.min(index + 1, Math.max(visibleOptions.length - 1, 0)));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === 'Enter' && open) {
                event.preventDefault();
                const option = visibleOptions[activeIndex];
                if (option) chooseOption(option);
              } else if (event.key === 'Escape') {
                setOpen(false);
                setQuery('');
              }
            }}
            className="min-w-[160px] flex-1 bg-transparent px-1 py-1 text-sm outline-none disabled:cursor-not-allowed disabled:text-leaf-700/45"
            placeholder={selectedOptions.length === 0 ? placeholder : disabled ? `最多选择 ${max} 个` : '继续选择'}
            disabled={disabled}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            autoComplete="off"
          />
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery('');
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((index) => Math.min(index + 1, Math.max(visibleOptions.length - 1, 0)));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter' && open) {
              event.preventDefault();
              const option = visibleOptions[activeIndex];
              if (option) chooseOption(option);
            } else if (event.key === 'Escape') {
              setOpen(false);
              setQuery('');
            }
          }}
          className={cn('input', invalid && 'border-rose-300 bg-rose-50/30')}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
        />
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-leaf-200 bg-white shadow-lg">
          {loading ? (
            <div className="p-4 text-center text-xs text-leaf-700/60">加载中...</div>
          ) : visibleOptions.length === 0 ? (
            <div className="p-4 text-center text-xs text-leaf-700/60">没有找到板块</div>
          ) : (
            <div className="p-1" role="listbox">
              {!query.trim() && recentKeys.length > 0 && (
                <div className="px-3 pb-1 pt-2 text-[10px] font-medium text-leaf-700/60">
                  最近选择
                </div>
              )}
              {visibleOptions.map((option, index) => {
                const selected = selectedKeys.has(option.key);
                const isRecent = !query.trim() && recentKeys.includes(option.key);
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseOption(option)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                      index === activeIndex ? 'bg-leaf-50 text-ink-800' : 'text-ink-700',
                      selected && 'font-medium text-leaf-800',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{option.title}</span>
                      {option.pathLabel && (
                        <span className="mt-0.5 block truncate text-[11px] font-normal text-leaf-700/60">
                          {option.pathLabel}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-leaf-50 px-2 py-0.5 text-[10px] font-normal text-leaf-700">
                      {levelLabel(option.level)}
                    </span>
                    {isRecent && !selected && (
                      <span className="shrink-0 text-[10px] font-normal text-leaf-700/50">最近</span>
                    )}
                    {selected && <span className="shrink-0 text-xs text-leaf-600">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildBoardOptions(boards: BoardNode[]): BoardOption[] {
  return boards.flatMap((category) => {
    const genera = category.genera ?? [];
    if (genera.length === 0) {
      return createOption([category], {
        categorySlug: category.slug,
        genusSlug: '',
        speciesSlug: '',
      });
    }

    return genera.flatMap((genus) => {
      const species = genus.species ?? [];
      if (species.length === 0) {
        return createOption([category, genus], {
          categorySlug: category.slug,
          genusSlug: genus.slug,
          speciesSlug: '',
        });
      }

      return species.map((item) =>
        createOption([category, genus, item], {
          categorySlug: category.slug,
          genusSlug: genus.slug,
          speciesSlug: item.slug,
        }),
      );
    });
  });
}

function createOption(path: BoardNode[], selection: BoardSelection): BoardOption {
  const label = path.map((item) => item.name).join(' / ');
  const node = path[path.length - 1];
  const ancestors = path.slice(0, -1);
  return {
    ...selection,
    key: selectionKey(selection),
    level: node.level,
    label,
    title: node.name,
    pathLabel: ancestors.map((item) => item.name).join(' / '),
    searchText: [
      label,
      ...path.flatMap((item) => [item.name, item.slug, item.latinName ?? '']),
    ].join(' '),
  };
}

function pickSelection(option: BoardOption): BoardSelection {
  return {
    categorySlug: option.categorySlug,
    genusSlug: option.genusSlug,
    speciesSlug: option.speciesSlug,
  };
}

function isSameSelection(a: BoardSelection, b: BoardSelection): boolean {
  return selectionKey(a) === selectionKey(b);
}

function selectionKey(selection: BoardSelection): string {
  return `${selection.categorySlug}:${selection.genusSlug}:${selection.speciesSlug}`;
}

function formatSelectedValue(option: BoardOption): string {
  return option.pathLabel ? `${option.title} - ${option.pathLabel}` : option.title;
}

function formatBoardPathLabel(option: BoardOption): string {
  return option.pathLabel ? `${option.pathLabel} / ${option.title}` : option.title;
}

function levelLabel(level: BoardLevel): string {
  switch (level) {
    case 'category':
      return '科';
    case 'genus':
      return '属';
    case 'species':
      return '品种';
    default:
      return '板块';
  }
}

function fuzzyMatch(text: string, query: string): boolean {
  const source = normalizeText(text);
  const target = normalizeText(query);
  if (!target) return true;
  if (source.includes(target)) return true;

  let targetIndex = 0;
  for (const char of source) {
    if (char === target[targetIndex]) targetIndex += 1;
    if (targetIndex === target.length) return true;
  }
  return false;
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}
