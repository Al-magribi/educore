export const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const randomDelayMs = (minSeconds, maxSeconds) => {
  const min = Math.max(1, Number(minSeconds) || 15);
  const max = Math.max(min, Number(maxSeconds) || 20);
  const seconds = Math.floor(Math.random() * (max - min + 1)) + min;
  return seconds * 1000;
};
