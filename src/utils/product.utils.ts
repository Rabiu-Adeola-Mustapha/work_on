export function randomText(repeat: number) {
  return "x"
    .repeat(repeat)
    .replace(
      /./g,
      (c) => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)]
    );
}
