import {createLoader, parseAsInteger} from 'nuqs/server';

export const eventsSearchParsers = {
  afterSeq: parseAsInteger.withDefault(0),
};

export const loadEventsSearchParams = createLoader(eventsSearchParsers);
