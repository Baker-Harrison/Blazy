// This file has one small helper function whose job is to invent a name for
// a new item (like a new workspace or tab) so that it doesn't clash with the
// names of items that already exist. It works the same way file explorers do
// when you copy a file called "photo.jpg" into a folder that already has one
// — you end up with "photo 2.jpg" instead of an error.

// existingNames: a list (array) of names that are already taken/in use.
// base: the name we'd LIKE to use, e.g. "Workspace".
// This function returns a name that is guaranteed not to already be in the list.
export function nextDefaultName(existingNames, base) {
  // If nothing is using the plain "base" name yet, we can just use it as-is.
  if (!existingNames.includes(base)) return base;

  // Otherwise, start trying "base 2", "base 3", "base 4", etc.,
  // until we find a number that isn't taken yet.
  let n = 2;
  while (existingNames.includes(`${base} ${n}`)) n++;

  // Return the first free "base N" combination we found.
  return `${base} ${n}`;
}
