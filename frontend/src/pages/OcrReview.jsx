import { useState } from 'react';

// M5 STOP POINT — stub review screen. Suggests, never auto-posts.
// Human must confirm via normal sales entry.
export default function OcrReview({ token }) {
  const [suggestions, setSuggestions] = useState(null);

  async function suggest() {
    const res = await fetch('/api/ocr/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ receipt_photo_url: '/uploads/demo.jpg' }),
    });
    if (res.ok) setSuggestions(await res.json());
  }

  return (
    <section>
      <h2>M5 stub: Receipt review (no auto-post)</h2>
      <button onClick={suggest}>Get suggestions (stub)</button>
      {suggestions && (
        <div>
          <p>{suggestions.note}</p>
          <ul>
            {suggestions.suggestions.map((s) => (
              <li key={s.product_id}>
                {s.name} x{s.qty} (conf {s.confidence}){s.ambiguous_with.length ? ` — same price as: ${s.ambiguous_with.join(', ')}` : ''}
              </li>
            ))}
          </ul>
          <p>To save: use Daily sales above to confirm. OCR never writes sales directly.</p>
        </div>
      )}
    </section>
  );
}
