import { useId, useRef, useState } from 'react';
import { APPLE_MODELS } from '../data/appleModels';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const MAX_SUGGESTIONS = 8;

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Combobox iPhone-first: sugiere modelos al tipear, pero acepta texto libre.
// Sin input vacío → muestra los más recientes (los primeros del array).
export default function ModeloPicker({ value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<number | undefined>(undefined);
  const listId = useId();

  const q = normalize(value);
  const matches = q
    ? APPLE_MODELS.filter((m) => normalize(m).includes(q))
    : APPLE_MODELS;
  const suggestions = matches.slice(0, MAX_SUGGESTIONS);

  const choose = (model: string) => {
    onChange(model);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && suggestions[active]) {
        e.preventDefault();
        choose(suggestions[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="combo">
      <input
        className="input"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder ?? 'Buscar iPhone…'}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay para permitir el click en una sugerencia antes de cerrar.
          blurTimer.current = window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={onKeyDown}
      />

      {open && suggestions.length > 0 && (
        <ul className="combo-list" id={listId} role="listbox">
          {suggestions.map((m, i) => (
            <li
              key={m}
              role="option"
              aria-selected={i === active}
              className={`combo-option ${i === active ? 'combo-option--active' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                // mousedown (no click) para ganarle al onBlur del input.
                e.preventDefault();
                window.clearTimeout(blurTimer.current);
                choose(m);
              }}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
