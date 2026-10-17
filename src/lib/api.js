export async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'The request could not be completed.');
  return body;
}

export async function readInvestigation(input, onEvent) {
  const response = await fetch('/api/investigate?stream=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error((await response.json()).error);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let completed = false;

  function consume(line) {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === 'error') throw new Error(event.message);
    if (event.type === 'complete') completed = true;
    onEvent(event);
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split('\n');
      pending = lines.pop();
      lines.forEach(consume);
    }
    pending += decoder.decode();
    consume(pending);
    if (!completed)
      throw new Error(
        'The connection ended before the case was complete. Check saved cases before running it again.',
      );
  } finally {
    reader.releaseLock();
  }
}
