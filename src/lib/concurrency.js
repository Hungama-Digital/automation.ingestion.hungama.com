async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function runNext() {
    const current = index++;
    if (current >= items.length) return;
    results[current] = await worker(items[current], current);
    await runNext();
  }

  const runners = [];
  const count = Math.min(limit, items.length);
  for (let i = 0; i < count; i++) runners.push(runNext());
  await Promise.all(runners);
  return results;
}

module.exports = { mapWithConcurrency };
