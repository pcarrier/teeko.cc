export type WinShape =
  | { kind: "line"; from: number; to: number }
  | { kind: "square"; corners: number[] };

// A win is either 4 collinear positions (stride 1, 4, 5 or 6) or a 2x2 square.
export function winShape(win: number[]): WinShape {
  const sorted = [...win].sort((a, b) => a - b);
  const stride = sorted[1] - sorted[0];
  if (sorted[2] - sorted[1] === stride && sorted[3] - sorted[2] === stride)
    return { kind: "line", from: sorted[0], to: sorted[3] };
  const tl = sorted[0];
  return { kind: "square", corners: [tl, tl + 1, tl + 6, tl + 5] };
}
