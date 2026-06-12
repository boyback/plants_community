'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { api } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import type { Board, BoardLevel } from '@/lib/types';
import styles from './BoardSelect.module.scss';
import { cx } from '@/lib/style-utils';



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
    invalid = false
  } = props;

  const isMultiple = props.multiple === true;
  const max = isMultiple ? props.max ?? 12 : 1;
  const [boards, setBoards] = useState<BoardNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentKeys, setRecentKeys] = useState<string[]>([]);
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.
    get<BoardNode[]>(apiPath).
    then((list) => {
      if (!cancelled) setBoards(Array.isArray(list) ? list : []);
    }).
    catch(() => {
      if (!cancelled) setBoards([]);
    }).
    finally(() => {
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
      const target = event.target as Node;
      if (
      !containerRef.current?.contains(target) &&
      !dropdownRef.current?.contains(target))
      {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    if (!open) {
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
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const options = useMemo(() => buildBoardOptions(boards), [boards]);
  const optionByKey = useMemo(() => new Map(options.map((option) => [option.key, option])), [options]);

  const selectedValues: BoardSelection[] = isMultiple ? props.values : [props.value];
  const selectedOptions = useMemo(
    () =>
    selectedValues.
    map((value) => options.find((option) => isSameSelection(option, value))).
    filter((option): option is BoardOption => Boolean(option)),
    [options, selectedValues]
  );
  const selectedKeys = useMemo(() => new Set(selectedOptions.map((option) => option.key)), [selectedOptions]);
  const selectedOption = selectedOptions[0] ?? null;

  useEffect(() => {
    if (open) updateDropdownPosition();
  }, [open, query, selectedOptions.length, updateDropdownPosition]);

  const visibleOptions = useMemo(() => {
    const q = query.trim();
    if (!q) {
      const recentOptions = recentKeys.
      map((key) => optionByKey.get(key)).
      filter((option): option is BoardOption => Boolean(option));
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
    !props.value.speciesSlug)
    {
      props.onChange({ ...pickSelection(options[0]), label: formatBoardPathLabel(options[0]) });
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
        { ...pickSelection(option), label: formatBoardPathLabel(option) }]
        );
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

  const displayValue = isMultiple ?
  query :
  open ?
  query :
  selectedOption ?
  formatSelectedValue(selectedOption) :
  '';
  const disabled = isMultiple && props.values.length >= max;

  const dropdown =
  open && dropdownStyle && typeof document !== 'undefined' ?
  createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className={cx(styles.dropdownLayer, styles.r_92bf82f4, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8)}>
        {loading ?
      <div className={cx(styles.r_8e63407b, styles.r_ca6bf630, styles.r_359090c2, styles.r_6c4cc49e)}>加载中...</div> :
      visibleOptions.length === 0 ?
      <div className={cx(styles.r_8e63407b, styles.r_ca6bf630, styles.r_359090c2, styles.r_6c4cc49e)}>没有找到板块</div> :

      <div className={styles.r_eb6a3cef} role="listbox">
            {!query.trim() && recentKeys.length > 0 &&
        <div className={cx(styles.r_0e17f2bd, styles.r_569eb162, styles.r_f46b61a9, styles.r_1dc571a3, styles.r_2689f395, styles.r_6c4cc49e)}>
                最近选择
              </div>
        }
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
              className={cn(cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_421ac2be, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65, styles.r_ceb69a6b),

              index === activeIndex ? cx(styles.r_7ebecbb6, styles.r_399e11a5) : styles.r_eb6abb1f,
              selected && cx(styles.r_2689f395, styles.r_e7eab4cb)
              )}>

                  <span className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                    <span className={cx(styles.r_0214b4b3, styles.r_f283ea9b, styles.r_fc7473ca, styles.r_2689f395)}>{option.title}</span>
                    {option.pathLabel &&
                <span className={cx(styles.r_15e1b1f4, styles.r_0214b4b3, styles.r_f283ea9b, styles.r_d058ca6d, styles.r_8ecebc9f, styles.r_6c4cc49e)}>
                        {option.pathLabel}
                      </span>
                }
                  </span>
                  <span className={cx(styles.r_012fbd12, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_8ecebc9f, styles.r_5f6a59f1)}>
                    {levelLabel(option.level)}
                  </span>
                  {isRecent && !selected &&
              <span className={cx(styles.r_012fbd12, styles.r_1dc571a3, styles.r_8ecebc9f, styles.r_3353f144)}>最近</span>
              }
                  {selected && <span className={cx(styles.r_012fbd12, styles.r_359090c2, styles.r_b17d6a13)}>✓</span>}
                </button>);

        })}
          </div>
      }
      </div>,
    document.body
  ) :
  null;

  return (
    <div ref={containerRef} className={cx(styles.r_d89972fe, styles.r_36e579c0)}>
      {isMultiple ?
      <div
        className={cn(cx(styles.r_60fbb771, styles.r_b6c95e22, styles.r_6da6a3c3, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_399e11a5, styles.r_df37b1fd, styles.r_ceb69a6b, styles.r_b29d0e9b, styles.r_38f81f91, styles.r_cfc1a9b4),

        invalid && cx(styles.r_3b7f9781, styles.r_fdae7b46, styles.r_af1cfc88, styles.r_8f70ad43)
        )}
        onClick={() => inputRef.current?.focus()}>

          {selectedOptions.map((option) =>
        <span
          key={option.key}
          className={cx(styles.r_52083e7d, styles.r_c0980a65, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_f2b23104, styles.r_d5eab218, styles.r_465609a2, styles.r_359090c2, styles.r_5f6a59f1)}>

              <span className={styles.r_f283ea9b}>{formatBoardPathLabel(option)}</span>
              <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              removeOption(option);
            }}
            className={cx(styles.r_012fbd12, styles.r_b17d6a13, styles.r_5eca0425)}>

                x
              </button>
            </span>
        )}
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
          className={cx(styles.r_a582411d, styles.r_36e579c0, styles.r_7f19cdf4, styles.r_5a270a0c, styles.r_fc7473ca, styles.r_df37b1fd, styles.r_bacacabf, styles.r_5f533b3a, styles.r_81517783)}
          placeholder={selectedOptions.length === 0 ? placeholder : disabled ? `最多选择 ${max} 个` : '继续选择'}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off" />

        </div> :

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
        className={cn('input', invalid && cx(styles.r_3b7f9781, styles.r_fdae7b46))}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off" />

      }

      {dropdown}
    </div>);

}

function buildBoardOptions(boards: BoardNode[]): BoardOption[] {
  return boards.flatMap((category) => {
    const genera = category.genera ?? [];
    if (genera.length === 0) {
      return createOption([category], {
        categorySlug: category.slug,
        genusSlug: '',
        speciesSlug: ''
      });
    }

    return genera.flatMap((genus) => {
      const species = genus.species ?? [];
      if (species.length === 0) {
        return createOption([category, genus], {
          categorySlug: category.slug,
          genusSlug: genus.slug,
          speciesSlug: ''
        });
      }

      return species.map((item) =>
      createOption([category, genus, item], {
        categorySlug: category.slug,
        genusSlug: genus.slug,
        speciesSlug: item.slug
      })
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
    ...path.flatMap((item) => [item.name, item.slug, item.latinName ?? ''])].
    join(' ')
  };
}

function pickSelection(option: BoardOption): BoardSelection {
  return {
    categorySlug: option.categorySlug,
    genusSlug: option.genusSlug,
    speciesSlug: option.speciesSlug
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
