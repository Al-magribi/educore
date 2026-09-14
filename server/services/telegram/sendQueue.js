export const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const randomDelayMs = (minSeconds, maxSeconds) => {
  const min = Math.max(0, Number(minSeconds) || 0);
  const max = Math.max(min, Number(maxSeconds) || min);
  if (max <= 0) return 0;
  const seconds = Math.floor(Math.random() * (max - min + 1)) + min;
  return seconds * 1000;
};
