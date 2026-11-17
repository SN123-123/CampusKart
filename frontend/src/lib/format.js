export const EMAIL_RE = /^pes\d[a-z]{2}\d{2}[a-z]{2,4}\d{3,4}@stu\.pes\.edu$/;

export const rupee = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export const CONDITIONS = {
  new: 'Brand new',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
};

export const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export function getCategoryClass(cat = '') {
  const c = String(cat).toLowerCase();
  if (c.includes('book')) return 'cat-books';
  if (c.includes('elect')) return 'cat-electronics';
  if (c.includes('furn')) return 'cat-furniture';
  if (c.includes('cycle') || c.includes('vehic')) return 'cat-cycles';
  if (c.includes('cloth') || c.includes('wear')) return 'cat-clothing';
  if (c.includes('lab') || c.includes('equip')) return 'cat-lab';
  if (c.includes('stat')) return 'cat-stationery';
  return 'cat-others';
}
