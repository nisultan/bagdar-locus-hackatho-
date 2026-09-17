import { useEffect, useState } from 'react';

export type Route = { stage: string; param?: string };

function parse(): Route {
  const [stage = '', param] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { stage: stage || 'start', param };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const go = (path: string) => {
  window.location.hash = '/' + path;
};
