import * as React from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Loader2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { buildPlaceSelection, type PlaceSelection } from '@/lib/places';

/**
 * Address input backed by Google Places Autocomplete (Places API "new":
 * AutocompleteSuggestion + Place.fetchFields), which the app already loads via
 * GoogleMapsProvider (libraries={['places','geometry','marker']}).
 *
 * Degradation is the whole point of the design:
 *   - no VITE_GOOGLE_MAPS_API_KEY  -> GoogleMapsProvider renders no APIProvider
 *                                     -> useMapsLibrary() returns null
 *                                     -> plain free-text input
 *   - Places API not enabled / quota -> first failure flips to free text
 *   - user types without picking      -> free text is submitted as-is
 * In every degraded path the form still saves; it just saves without
 * coordinates, exactly as it did before this component existed.
 *
 * Implements the WAI-ARIA 1.2 combobox-with-listbox pattern (arrow keys, Enter,
 * Escape, aria-activedescendant, polite result count).
 */

const DEBOUNCE_MS = 250;
const MIN_QUERY_LENGTH = 3;
const MAX_SUGGESTIONS = 5;

interface Suggestion {
  key: string;
  primary: string;
  secondary: string;
  prediction: google.maps.places.PlacePrediction;
}

export interface PlacesAutocompleteInputProps {
  value: string;
  /** Free-text edits. Callers should clear any previously geocoded fields here. */
  onChange: (value: string) => void;
  /** Fired only when a suggestion is chosen and its details resolve. */
  onPlaceSelect?: (selection: PlaceSelection) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

export default function PlacesAutocompleteInput({
  value,
  onChange,
  onPlaceSelect,
  onBlur,
  name,
  id,
  placeholder,
  className,
  disabled,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: PlacesAutocompleteInputProps) {
  const placesLib = useMapsLibrary('places');
  const reactId = React.useId();
  const listboxId = `${id ?? reactId}-places-listbox`;
  const statusId = `${id ?? reactId}-places-status`;

  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [loading, setLoading] = React.useState(false);
  /** Set once the Places API rejects us; from then on this is a plain input. */
  const [unavailable, setUnavailable] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const sessionTokenRef = React.useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  /** Guards against a slow response overwriting a newer one. */
  const requestSeqRef = React.useRef(0);
  /** Suppresses the fetch that a programmatic value change would otherwise trigger. */
  const skipNextFetchRef = React.useRef(false);

  const supportsAutocomplete =
    !unavailable &&
    !disabled &&
    typeof placesLib?.AutocompleteSuggestion?.fetchAutocompleteSuggestions === 'function';

  const closeList = React.useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  // Close when focus or a pointer leaves the widget.
  React.useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) closeList();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open, closeList]);

  // Debounced suggestion fetch.
  React.useEffect(() => {
    if (!supportsAutocomplete) return;
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      closeList();
      return;
    }

    const seq = ++requestSeqRef.current;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      if (!placesLib) return;
      try {
        sessionTokenRef.current ??= new placesLib.AutocompleteSessionToken();

        const { suggestions: raw } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            includedRegionCodes: ['us'],
            sessionToken: sessionTokenRef.current,
          });

        if (seq !== requestSeqRef.current) return; // stale response

        const next: Suggestion[] = raw
          .map((item) => item.placePrediction)
          .filter((p): p is google.maps.places.PlacePrediction => p !== null)
          .slice(0, MAX_SUGGESTIONS)
          .map((prediction) => ({
            key: prediction.placeId,
            primary: prediction.mainText?.text ?? prediction.text?.text ?? '',
            secondary: prediction.secondaryText?.text ?? '',
            prediction,
          }));

        setSuggestions(next);
        setActiveIndex(-1);
        setOpen(next.length > 0);
      } catch (error) {
        if (seq !== requestSeqRef.current) return;
        // One warning, then permanent free-text mode. No error toast: a
        // misconfigured Maps key must not block mission creation.
        console.warn(
          '[PlacesAutocompleteInput] Places Autocomplete unavailable, falling back to free text.',
          error,
        );
        setUnavailable(true);
        setSuggestions([]);
        closeList();
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [value, placesLib, supportsAutocomplete, closeList]);

  const selectSuggestion = React.useCallback(
    async (suggestion: Suggestion) => {
      const typed = [suggestion.primary, suggestion.secondary].filter(Boolean).join(', ');
      // Optimistic: show the chosen label immediately, resolve details after.
      skipNextFetchRef.current = true;
      onChange(typed);
      closeList();
      setLoading(true);

      try {
        const place = suggestion.prediction.toPlace();
        await place.fetchFields({
          fields: ['formattedAddress', 'addressComponents', 'location'],
        });

        const selection = buildPlaceSelection({
          formattedAddress: place.formattedAddress,
          addressComponents: place.addressComponents,
          location: place.location
            ? { lat: place.location.lat(), lng: place.location.lng() }
            : null,
          fallbackAddress: typed,
        });

        skipNextFetchRef.current = true;
        onChange(selection.address || typed);
        onPlaceSelect?.(selection);
      } catch (error) {
        console.warn('[PlacesAutocompleteInput] Place details lookup failed.', error);
      } finally {
        // A session token covers one search + one details call.
        sessionTokenRef.current = null;
        setLoading(false);
      }
    },
    [onChange, onPlaceSelect, closeList],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!supportsAutocomplete) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!open && suggestions.length > 0) {
        setOpen(true);
        setActiveIndex(event.key === 'ArrowDown' ? 0 : suggestions.length - 1);
        event.preventDefault();
        return;
      }
      if (!open) return;
      event.preventDefault();
      setActiveIndex((prev) => {
        const last = suggestions.length - 1;
        if (event.key === 'ArrowDown') return prev >= last ? 0 : prev + 1;
        return prev <= 0 ? last : prev - 1;
      });
      return;
    }

    if (event.key === 'Enter' && open && activeIndex >= 0) {
      // Only swallow Enter when a suggestion is highlighted, so the form can
      // still be submitted from this field otherwise.
      event.preventDefault();
      void selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeList();
      return;
    }

    if (event.key === 'Tab') closeList();
  };

  const activeOptionId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          id={id}
          name={name}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          className={cn('min-h-[44px]', supportsAutocomplete && 'pr-9', className)}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={ariaInvalid}
          aria-describedby={[ariaDescribedBy, supportsAutocomplete ? statusId : null]
            .filter(Boolean)
            .join(' ') || undefined}
          {...(supportsAutocomplete
            ? {
                role: 'combobox' as const,
                'aria-expanded': open,
                'aria-controls': listboxId,
                'aria-autocomplete': 'list' as const,
                'aria-activedescendant': activeOptionId,
              }
            : {})}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (supportsAutocomplete && suggestions.length > 0) setOpen(true);
          }}
          onBlur={onBlur}
        />
        {supportsAutocomplete && (
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
          </span>
        )}
      </div>

      {supportsAutocomplete && (
        <span id={statusId} className="sr-only" role="status" aria-live="polite">
          {open && suggestions.length > 0
            ? `${suggestions.length} address suggestion${suggestions.length === 1 ? '' : 's'} available. Use arrow keys to review, Enter to select.`
            : ''}
        </span>
      )}

      {supportsAutocomplete && open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Address suggestions"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.key}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                'flex min-h-[44px] cursor-pointer flex-col justify-center rounded-sm px-3 py-2 text-sm',
                index === activeIndex ? 'bg-accent text-accent-foreground' : 'text-foreground',
              )}
              // mousedown, not click: the input must not blur before selection.
              onMouseDown={(event) => {
                event.preventDefault();
                void selectSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="font-medium">{suggestion.primary}</span>
              {suggestion.secondary && (
                <span className="text-xs text-muted-foreground">{suggestion.secondary}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
