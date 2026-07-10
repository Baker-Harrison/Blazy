export function nextDefaultName(existingNames, base) {
  if (!existingNames.includes(base)) return base;
  let n = 2;
  while (existingNames.includes(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}
