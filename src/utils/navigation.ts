let globalNavigate: ((path: string) => void) | null = null;

export const setGlobalNavigate = (navigateFn: (path: string) => void) => {
  globalNavigate = navigateFn;
};

export const navigateTo = (path: string) => {
  if (globalNavigate) {
    globalNavigate(path);
  } else {
    window.location.href = path; // fallback (first load)
  }
};
